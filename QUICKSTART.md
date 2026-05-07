# Guide de Démarrage Rapide - FactureChain

## Prérequis

- **Java 17+** - [Télécharger Java](https://www.oracle.com/java/technologies/downloads/)
- **Node.js 18+** - [Télécharger Node.js](https://nodejs.org/)
- **PostgreSQL 12+** - [Télécharger PostgreSQL](https://www.postgresql.org/download/)
- **Git** - [Télécharger Git](https://git-scm.com/)
- **Docker (Optionnel)** - [Télécharger Docker](https://www.docker.com/)

## Installation Option 1: Avec Docker (Recommandé)

### 1. Cloner le projet
```bash
cd FactureChainApp
```

### 2. Démarrer PostgreSQL avec Docker Compose
```bash
docker-compose up -d
```

Cela démarrera:
- PostgreSQL sur le port 5432
- pgAdmin sur le port 5050

### 3. Démarrer le Backend
```bash
cd backend/facturechain-backend

# Compiler le projet
mvn clean install

# Lancer l'application
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=local"
```

Le backend sera accessible sur `http://localhost:8080`

### 4. Démarrer le Frontend
```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

---

## Installation Option 2: Installation Manuelle

### 1. Créer la base de données PostgreSQL
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE facturechain_db;

# Exécuter le script d'initialisation
\c facturechain_db
\i init-db.sql

# Quitter
\q
```

### 2. Configurer le Backend
```bash
cd backend/facturechain-backend

# Éditer application.yml avec vos paramètres PostgreSQL
nano src/main/resources/application.yml

# Compiler
mvn clean install

# Lancer
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=local"
```

### 3. Configurer le Frontend
```bash
cd frontend

# Créer le fichier .env.local
cp .env.example .env.local

# Éditer .env.local si nécessaire
nano .env.local

# Installer et démarrer
npm install
npm run dev
```

---

## Accès à l'Application

### Frontend
- **URL**: http://localhost:5173
- **Utilisateur par défaut**: 
  - Email: `admin@facturechain.com`
  - Mot de passe: `admin123`

### Backend API
- **URL**: http://localhost:8080/api
- **Endpoints**:
  - POST `/api/auth/login` - Connexion
  - POST `/api/auth/signup` - Inscription
  - POST `/api/auth/refresh` - Rafraîchir le token

### pgAdmin (Base de données)
- **URL**: http://localhost:5050
- **Email**: admin@facturechain.com
- **Mot de passe**: admin

---

## Structure du Projet

```
FactureChainApp/
├── backend/
│   └── facturechain-backend/          # Spring Boot backend
│       ├── src/main/java/com/facturechain/
│       │   ├── model/                 # Entités JPA
│       │   ├── controller/            # Contrôleurs REST
│       │   ├── service/               # Services métier
│       │   ├── repository/            # Accès données
│       │   ├── security/              # Sécurité & JWT
│       │   └── config/                # Configuration
│       └── pom.xml                    # Dépendances Maven
│
├── frontend/
│   ├── src/
│   │   ├── api/                       # Services API
│   │   ├── components/                # Composants React
│   │   ├── hooks/                     # Hooks custom
│   │   ├── routes/                    # Pages/Routes
│   │   └── lib/                       # Utilitaires
│   ├── package.json
│   └── tsconfig.json
│
├── blockchain/                         # Hyperledger Fabric
├── docker-compose.yml                 # Configuration Docker
├── init-db.sql                        # Initialisation BD
└── AUTHENTICATION_GUIDE.md            # Documentation
```

---

## Commandes Utiles

### Backend

```bash
# Compiler et tester
mvn clean install

# Lancer les tests
mvn test

# Compiler en JAR
mvn package

# Lancer directement
mvn spring-boot:run

# Avec profil local
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=local"
```

### Frontend

```bash
# Installation
npm install

# Développement
npm run dev

# Build production
npm run build

# Linter
npm run lint

# Formater le code
npm run format

# Aperçu build
npm run preview
```

### Docker

```bash
# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Voir les logs
docker-compose logs -f

# Nettoyer les volumes
docker-compose down -v
```

---

## Dépannage

### Erreur: Port 5432 déjà utilisé
```bash
# Trouver le processus
lsof -i :5432

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port dans docker-compose
```

### Erreur: "Connection refused" PostgreSQL
```bash
# Vérifier que PostgreSQL est lancé
docker-compose ps

# Redémarrer si nécessaire
docker-compose restart postgres
```

### Erreur: Migration Liquibase (Backend)
```bash
# Nettoyer et relancer
mvn clean install
mvn spring-boot:run
```

### Erreur: npm packages
```bash
# Nettoyer le cache npm
npm cache clean --force

# Réinstaller
rm -rf node_modules
npm install
```

---

## Variables d'Environnement

### Backend (application.yml)
```yaml
jwt.secret: Votre clé JWT (minimum 256 bits)
jwt.expiration: Durée du token (millisecondes)
spring.datasource.url: URL PostgreSQL
spring.datasource.username: Utilisateur PostgreSQL
spring.datasource.password: Mot de passe PostgreSQL
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=FactureChain
```

---

## Tester l'Authentification

### Avec cURL

```bash
# Inscription
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "subscriberCode": "CM-YDE-12345"
  }'

# Connexion
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Avec Postman

1. Créer une nouvelle collection "FactureChain"
2. Ajouter les requêtes:
   - POST http://localhost:8080/api/auth/signup
   - POST http://localhost:8080/api/auth/login
   - POST http://localhost:8080/api/auth/refresh

---

## Prochaines Étapes

1. ✅ Authentification avec JWT
2. ⏳ Tableau de bord utilisateur
3. ⏳ Intégration blockchain
4. ⏳ Gestion des factures
5. ⏳ Anomalies détection IA
6. ⏳ Réclamations et suivi

---

## Support et Documentation

- 📖 [Guide Complet d'Authentification](./AUTHENTICATION_GUIDE.md)
- 📚 [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- ⚛️ [React Documentation](https://react.dev)
- 🐘 [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- 🔐 [JWT.io](https://jwt.io)

---

**Dernière mise à jour**: Mai 2026
