-- Initialisation de la base de données FactureChain

-- Créer les extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer un enum pour les rôles
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPPORT');

-- Table users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    subscriber_code VARCHAR(255) UNIQUE NOT NULL,
    city VARCHAR(255),
    district VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    role user_role DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index sur les colonnes fréquemment cherchées
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_subscriber_code ON users(subscriber_code);

-- Insérer un utilisateur administrateur par défaut (optionnel)
-- Password: "admin123" hashed with bcrypt
INSERT INTO users (username, email, password, full_name, subscriber_code, role, verified, enabled)
VALUES (
    'admin',
    'admin@facturechain.com',
    '$2a$10$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy77c5m', -- bcrypt hash of "admin123"
    'Administrator',
    'ADMIN-001',
    'ADMIN',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Créer la table audit_logs pour tracer les connexions
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Créer une fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer le trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
