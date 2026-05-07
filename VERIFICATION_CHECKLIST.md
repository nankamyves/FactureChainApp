# Checklist de Vérification - Authentification FactureChain

## Avant le Démarrage ✓

- [ ] Java 17+ installé: `java -version`
- [ ] Node.js 18+ installé: `node -v`
- [ ] PostgreSQL 12+ installé ou Docker disponible
- [ ] Maven installé: `mvn -version`
- [ ] Git installé: `git --version`

## Installation Backend

- [ ] Naviguer vers `backend/facturechain-backend`
- [ ] Exécuter `mvn clean install`
- [ ] Fichiers créés:
  - [ ] `src/main/java/com/facturechain/model/User.java`
  - [ ] `src/main/java/com/facturechain/model/UserRole.java`
  - [ ] `src/main/java/com/facturechain/model/AuditLog.java`
  - [ ] `src/main/java/com/facturechain/dto/auth/*` (3 fichiers)
  - [ ] `src/main/java/com/facturechain/repository/*` (2 fichiers)
  - [ ] `src/main/java/com/facturechain/security/*` (2 fichiers)
  - [ ] `src/main/java/com/facturechain/service/*` (3 fichiers)
  - [ ] `src/main/java/com/facturechain/controller/AuthenticationController.java`
  - [ ] `src/main/java/com/facturechain/config/SecurityConfig.java`
  - [ ] `src/main/resources/application.yml` (mis à jour)
  - [ ] `src/main/resources/application-local.yml` (créé)

- [ ] Dépendances pom.xml:
  - [ ] PostgreSQL driver
  - [ ] Spring Security
  - [ ] JJWT (3 dépendances)

## Installation Frontend

- [ ] Naviguer vers `frontend`
- [ ] Exécuter `npm install`
- [ ] Fichiers créés:
  - [ ] `src/api/auth-types.ts`
  - [ ] `src/api/auth-service.ts`
  - [ ] `src/hooks/use-auth.tsx`
  - [ ] `src/hooks/use-authenticated-fetch.tsx`
  - [ ] `src/components/ProtectedRoute.tsx`
  - [ ] `src/routes/login.tsx` (mis à jour)
  - [ ] `.env.example`
  - [ ] `.env.local`

## Base de Données

- [ ] Docker: `docker-compose up -d`
  OU
- [ ] PostgreSQL lancé manuellement
- [ ] Database `facturechain_db` créée
- [ ] `init-db.sql` exécuté
- [ ] Tables créées:
  - [ ] `users`
  - [ ] `audit_logs`
- [ ] Utilisateur admin créé (admin@facturechain.com)
- [ ] pgAdmin accessible: http://localhost:5050

## Configuration

- [ ] Backend configuré:
  - [ ] `application.yml` avec PostgreSQL url correcte
  - [ ] `jwt.secret` défini
  - [ ] `jwt.expiration` défini
  - [ ] Profil `local` sélectionné

- [ ] Frontend configuré:
  - [ ] `.env.local` avec `VITE_API_URL=http://localhost:8080/api`

## Démarrage Services

- [ ] PostgreSQL démarré (port 5432)
- [ ] Backend démarré: `mvn spring-boot:run`
  - [ ] Pas d'erreurs au démarrage
  - [ ] Accessible sur http://localhost:8080
  - [ ] Logs montrent "FactureChain application started"

- [ ] Frontend démarré: `npm run dev`
  - [ ] Vite serveur lancé
  - [ ] Accessible sur http://localhost:5173
  - [ ] Page login s'affiche

## Tests Fonctionnels

### Connexion Admin (défaut)
- [ ] Email: `admin@facturechain.com`
- [ ] Mot de passe: `admin123`
- [ ] Clic "Se connecter"
- [ ] ✓ Redirection vers dashboard
- [ ] ✓ Token sauvegardé en localStorage

### Inscription Nouvel Utilisateur
- [ ] Clic sur onglet "Première connexion"
- [ ] Remplir formulaire:
  - [ ] Nom d'utilisateur
  - [ ] Email unique
  - [ ] Code d'abonné (ex: CM-YDE-12345)
  - [ ] Mot de passe (min 6 caractères)
  - [ ] Confirmation mot de passe
- [ ] Clic "Créer mon compte"
- [ ] ✓ Compte créé
- [ ] ✓ Connexion automatique
- [ ] ✓ Redirection dashboard

### Validation Formulaire
- [ ] Email invalide: message d'erreur
- [ ] Mots de passe non correspondants: message d'erreur
- [ ] Mot de passe court: message d'erreur
- [ ] Code d'abonné vide: message d'erreur

### Erreurs de Connexion
- [ ] Email inexistant: "Email ou mot de passe incorrect"
- [ ] Mot de passe faux: "Email ou mot de passe incorrect"
- [ ] Serveur arrêté: message d'erreur approprié

### Gestion Token
- [ ] localStorage contient access_token
- [ ] localStorage contient refresh_token
- [ ] localStorage contient user info (JSON)

### Déconnexion
- [ ] Fonction logout vide localStorage
- [ ] Redirection vers login
- [ ] Page protégée non accessible

### Routes Protégées
- [ ] Dashboard non accessible sans authentification
- [ ] Redirection automatique vers login
- [ ] ✓ Accessible après connexion

## API Endpoints

### POST /api/auth/signup
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "subscriberCode": "CM-YDE-TEST"
  }'
```
- [ ] ✓ Retourne 201 Created
- [ ] ✓ Response contient token, refreshToken, user

### POST /api/auth/login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```
- [ ] ✓ Retourne 200 OK
- [ ] ✓ Response contient tokens et user info

### POST /api/auth/refresh
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```
- [ ] ✓ Retourne nouveau access token
- [ ] ✓ Ancien access token invalidé

### GET /api/auth/me
```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```
- [ ] ✓ Retourne 200 OK
- [ ] ✓ Sans token: 401 Unauthorized

## Logs & Audit

- [ ] pgAdmin accessible: http://localhost:5050
- [ ] Authentification audit_logs:
  - [ ] Enregistrements LOGIN
  - [ ] Enregistrements SIGNUP
  - [ ] IP address capturée
  - [ ] User agent capturé
  - [ ] Timestamp correct

## Documentation

- [ ] AUTHENTICATION_GUIDE.md existe et est lisible
- [ ] QUICKSTART.md existe et est lisible
- [ ] AUTHENTICATION_SUMMARY.md existe et est lisible
- [ ] Commentaires dans le code
- [ ] README.md mettra à jour (optionnel)

## Performance & Sécurité

- [ ] JWT signature valide
- [ ] BCrypt passwords (ne pas voir plain text)
- [ ] CORS headers corrects
- [ ] Pas d'erreurs SQL dans les logs
- [ ] Pas d'expositions credentials
- [ ] Pas d'avertissements de sécurité Spring
- [ ] localStorage tokens non accessibles via XSS basique

## Prochaines Étapes

- [ ] Intégrer à dashboard existant
- [ ] Ajouter refresh token automatique
- [ ] Implémenter 2FA
- [ ] Ajouter vérification email
- [ ] Tester en production

---

## Commandes de Vérification Rapide

```bash
# Vérifier Java
java -version

# Vérifier Maven
mvn -version

# Vérifier Node
node -v
npm -v

# Vérifier PostgreSQL
psql --version

# Tester connexion PostgreSQL
psql -h localhost -U postgres -d facturechain_db -c "SELECT version();"

# Vérifier tables
psql -h localhost -U postgres -d facturechain_db -c "\dt"

# Tester backend
curl http://localhost:8080/

# Tester frontend
curl http://localhost:5173/

# Vérifier ports
lsof -i :5432    # PostgreSQL
lsof -i :5050    # pgAdmin
lsof -i :8080    # Backend
lsof -i :5173    # Frontend
```

---

✅ **Une fois que toutes les cases sont cochées, votre système d'authentification est prêt pour le développement!**
