#!/usr/bin/env node

/**
 * Script de verificación de API Key de Gemini
 * Ejecuta: node verificar-api-key.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificando configuración de API Key de Gemini...\n');

const envPath = path.join(__dirname, '.env.local');

// Verificar si el archivo existe
if (!fs.existsSync(envPath)) {
  console.log('❌ ERROR: No se encontró el archivo .env.local');
  console.log('📝 Solución: Crea el archivo .env.local en la raíz del proyecto');
  console.log('   Ejemplo: echo "GEMINI_API_KEY=tu_clave_aqui" > .env.local\n');
  process.exit(1);
}

// Leer el archivo
const envContent = fs.readFileSync(envPath, 'utf-8');

// Buscar GEMINI_API_KEY
const apiKeyMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);

if (!apiKeyMatch) {
  console.log('❌ ERROR: No se encontró GEMINI_API_KEY en .env.local');
  console.log('📝 Solución: Agrega la línea: GEMINI_API_KEY=tu_clave_aqui\n');
  process.exit(1);
}

const apiKey = apiKeyMatch[1].trim();

// Verificar si es un placeholder
const placeholders = [
  'PLACEHOLDER_API_KEY',
  'TU_API_KEY_AQUI',
  'tu_clave_api_aqui',
  'your_api_key',
  'YOUR_API_KEY'
];

if (placeholders.some(placeholder => apiKey.includes(placeholder))) {
  console.log('⚠️  ADVERTENCIA: La API Key parece ser un placeholder');
  console.log(`   Valor actual: ${apiKey}`);
  console.log('📝 Solución: Reemplaza el placeholder con tu API key real de Google Gemini\n');
  process.exit(1);
}

// Verificar formato básico
if (apiKey.length < 20) {
  console.log('⚠️  ADVERTENCIA: La API Key parece ser muy corta');
  console.log(`   Longitud: ${apiKey.length} caracteres`);
  console.log('📝 Las API keys de Gemini suelen tener más de 30 caracteres\n');
}

if (!apiKey.startsWith('AIzaSy')) {
  console.log('⚠️  ADVERTENCIA: La API Key no tiene el formato esperado');
  console.log('📝 Las API keys de Gemini suelen empezar con "AIzaSy"');
  console.log(`   Tu clave empieza con: ${apiKey.substring(0, 10)}...\n`);
}

// Verificar espacios alrededor del =
if (apiKeyMatch[0].includes(' = ') || apiKeyMatch[0].includes('= ')) {
  console.log('⚠️  ADVERTENCIA: Hay espacios alrededor del signo =');
  console.log('📝 El formato correcto es: GEMINI_API_KEY=valor (sin espacios)\n');
}

// Si llegamos aquí, parece estar bien configurada
console.log('✅ La API Key está configurada en .env.local');
console.log(`   Formato: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 5)}`);
console.log(`   Longitud: ${apiKey.length} caracteres\n`);

console.log('📋 Próximos pasos:');
console.log('   1. Reinicia el servidor de desarrollo (npm run dev)');
console.log('   2. Prueba la aplicación en la sección "Narrative Engine"');
console.log('   3. Si hay errores, verifica que la API key sea válida\n');
