#!/bin/bash

# Instalar dependencias de i18n
echo "Instalando dependencias de internacionalización..."

# Navegar al directorio del frontend
cd /Users/santiolaciregui/Downloads/chatbot-admin-panel

# Instalar dependencias
npm install react-i18next i18next i18next-browser-languagedetector

echo "Dependencias instaladas exitosamente!"
echo ""
echo "Para usar el sistema de internacionalización:"
echo "1. Las traducciones están en /i18n/locales/"
echo "2. Cambia idioma con el selector en el sidebar"
echo "3. Usa useTranslation() hook en componentes: const { t } = useTranslation();"
echo "4. Traduce texto con: t('auth.login') o t('dashboard.welcome', { name: 'Juan' })"
