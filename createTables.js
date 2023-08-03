const client = require("./db.js")
const bcrypt = require("bcrypt")

async function createTables(){
    await client.query(`
    SET search_path TO public;

    CREATE TABLE IF NOT EXISTS admin(
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_by INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS doctors(
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_by INTEGER REFERENCES admin(id) NOT NULL,
        deleted VARCHAR(255) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS patients(
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_by INTEGER REFERENCES admin(id) NOT NULL,
        deleted VARCHAR(255) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS appointments(
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) NOT NULL,
        doctor_id INTEGER REFERENCES doctors(id) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(255) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS visits(
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) NOT NULL,
        doctor_id INTEGER REFERENCES doctors(id) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS exams(
        id SERIAL PRIMARY KEY,
        visit_id INTEGER REFERENCES visits(id) NOT NULL,
        doctor_comment VARCHAR(255)
    );

    DO
    $$
    BEGIN
        IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'visit_id'
    ) THEN
    ALTER TABLE public.appointments
    ADD COLUMN visit_id INTEGER REFERENCES public.visits(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'visits' AND column_name = 'appointment_id'
    ) THEN
    ALTER TABLE public.visits
    ADD COLUMN appointment_id INTEGER REFERENCES public.appointments(id);
    END IF;
    END;
    $$;
    
    `)
    const hashedPassword = await bcrypt.hash("admin123", 10)
    try{
        await client.query(
            `INSERT INTO "admin" ("email", "name", "password", "created_by") VALUES ($1, $2, $3, $4)`,
            ["admin123@gmail.com", "Admin123", hashedPassword, 0]
        )
    }catch{
        
    }
}

module.exports = createTables;

