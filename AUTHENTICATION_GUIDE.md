# Système d'Authentification FactureChain

## Vue d'ensemble

Ce système fournit une authentification complète avec JWT (JSON Web Tokens) utilisant PostgreSQL pour le stockage des utilisateurs.

## Architecture

### Backend (Spring Boot 4.0.6 avec Java 17)

#### Dépendances principales:
- **PostgreSQL** - Base de données
- **Spring Security** - Authentification et autorisation
- **JJWT** - Génération et validation JWT
- **Spring Data JPA** - ORM

#### Entités:
- **User** - Entité utilisateur avec rôles
- **UserRole** - Enum des rôles (USER, ADMIN, SUPPORT)

#### Services:
- **JwtService** - Gestion des tokens JWT
- **AuthenticationService** - Logique d'authentification
- **UserDetailsServiceImpl** - Implémentation de UserDetailsService

#### Contrôleur:
- **AuthenticationController** - Endpoints d'authentification:
  - `POST /api/auth/signup` - Inscription
  - `POST /api/auth/login` - Connexion
  - `POST /api/auth/refresh` - Rafraîchir le token

### Frontend (React + TypeScript)

#### Types:
- **LoginRequest** - Requête de connexion
- **SignupRequest** - Requête d'inscription
- **AuthResponse** - Réponse authentification
- **UserInfo** - Informations utilisateur

#### Services:
- **authService** - Service d'authentification centralisé

#### Hooks:
- **useAuth()** - Hook pour accéder à l'état d'authentification
- **useAuthenticatedFetch()** - Hook pour les appels API authentifiés

#### Composants:
- **ProtectedRoute** - Composant de route protégée
- **LoginPage** - Page d'authentification améliorée

## Configuration

### Backend

#### 1. Application.yml
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/facturechain_db
    username: postgres
    password: password
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect

jwt:
  secret: your-secret-key-256-bits-minimum
  expiration: 86400000 # 24 heures
  refresh:
    expiration: 604800000 # 7 jours
```

#### 2. Base de données PostgreSQL

```sql
CREATE DATABASE facturechain_db;

-- La table users sera créée automatiquement par Hibernate
-- Colonnes principales:
-- - id (BIGSERIAL PRIMARY KEY)
-- - username (VARCHAR UNIQUE NOT NULL)
-- - email (VARCHAR UNIQUE NOT NULL)
-- - password (VARCHAR NOT NULL)
-- - full_name (VARCHAR)
-- - subscriber_code (VARCHAR UNIQUE NOT NULL)
-- - city (VARCHAR)
-- - district (VARCHAR)
-- - verified (BOOLEAN DEFAULT FALSE)
-- - enabled (BOOLEAN DEFAULT TRUE)
-- - role (ENUM: USER, ADMIN, SUPPORT)
-- - created_at (TIMESTAMP)
-- - updated_at (TIMESTAMP)
```

### Frontend

#### Variables d'environnement (.env)
```env
VITE_API_URL=http://localhost:8080/api
```

## Flux d'utilisation

### 1. Inscription

```typescript
import { authService } from "@/api/auth-service";

const response = await authService.signup({
  username: "john_doe",
  email: "john@example.com",
  password: "SecurePassword123",
  confirmPassword: "SecurePassword123",
  fullName: "John Doe",
  subscriberCode: "CM-YDE-12345",
  city: "Yaoundé",
  district: "Quartier",
});

// Token et user info sont automatiquement sauvegardés
console.log(response.user);
```

### 2. Connexion

```typescript
const response = await authService.login({
  email: "john@example.com",
  password: "SecurePassword123",
});

console.log(response.user);
```

### 3. Utiliser l'authentification dans les composants

```typescript
import { useAuth } from "@/hooks/use-auth";

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Veuillez vous connecter</div>;
  }

  return (
    <div>
      <p>Bienvenue, {user?.fullName}</p>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

### 4. Appels API authentifiés

```typescript
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";

function MyComponent() {
  const { fetchWithAuth } = useAuthenticatedFetch();

  async function getData() {
    try {
      const data = await fetchWithAuth("/api/protected-endpoint");
      console.log(data);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return <button onClick={getData}>Get Data</button>;
}
```

### 5. Routes protégées

```typescript
import { ProtectedRoute } from "@/components/ProtectedRoute";

function ProtectedPage() {
  return (
    <ProtectedRoute requiredRole="USER">
      <div>Contenu protégé</div>
    </ProtectedRoute>
  );
}
```

## Flux de token JWT

1. **Login/Signup** → Obtenir access_token et refresh_token
2. **Access_token** → Stocker en localStorage (expiré en 24h)
3. **Refresh_token** → Stocker en localStorage (expiré en 7 jours)
4. **API Call** → Envoyer access_token dans le header Authorization
5. **Token expiré** → Utiliser refresh_token pour obtenir un nouveau access_token

## Sécurité

### Recommandations

1. **JWT Secret** - Minimum 256 bits, très sécurisé en production
2. **HTTPS** - Toujours utiliser HTTPS en production
3. **Token Storage** - Considérer HTTPOnly cookies au lieu de localStorage
4. **CORS** - Configurer les origines autorisées
5. **Validation** - Valider toutes les inputs côté backend
6. **Encryption** - Utiliser bcrypt pour les mots de passe (déjà configuré)

### Configuration CORS backend

```java
@CrossOrigin(origins = {"http://localhost:3000", "https://yourdomain.com"}, maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthenticationController { ... }
```

## Endpoints API

### POST /api/auth/signup
Inscription nouvel utilisateur

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123",
  "fullName": "John Doe",
  "subscriberCode": "CM-YDE-12345",
  "city": "Yaoundé",
  "district": "Quartier"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "subscriberCode": "CM-YDE-12345",
    "role": "USER"
  }
}
```

### POST /api/auth/login
Connexion utilisateur

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "subscriberCode": "CM-YDE-12345",
    "role": "USER"
  }
}
```

### POST /api/auth/refresh
Rafraîchir le token

**Request Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

## Déploiement

### Prerequisites
- PostgreSQL 12+
- Java 17+
- Node.js 18+ (pour le frontend)

### Étapes

1. **Base de données**
   ```bash
   # Créer la base de données
   createdb facturechain_db
   ```

2. **Backend**
   ```bash
   cd backend/facturechain-backend
   
   # Compiler et lancer les tests
   mvn clean package
   
   # Démarrer l'application
   java -jar target/facturechain-backend-0.0.1-SNAPSHOT.jar
   ```

3. **Frontend**
   ```bash
   cd frontend
   
   # Installer les dépendances
   npm install
   
   # Démarrer le serveur de développement
   npm run dev
   
   # Build pour la production
   npm run build
   ```

## Dépannage

### Erreur: Connection refused (PostgreSQL)
- Vérifier que PostgreSQL est lancé
- Vérifier la configuration datasource dans application.yml

### Erreur: "Invalid JWT"
- Vérifier que le secret JWT est identique backend/frontend
- Vérifier l'expiration du token

### Erreur: CORS
- Configurer correctement les origines dans @CrossOrigin
- Vérifier les headers de la requête

## Prochaines étapes

1. Implémenter la vérification d'email
2. Ajouter le double-facteur (2FA)
3. Implémenter la récupération de mot de passe
4. Ajouter les rôles et permissions granulaires
5. Implémenter les logs d'authentification
