# Etapa 1: Build de la app con Vite
FROM node:18 as build
WORKDIR /app

# Copiar package.json y lock
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la app (carpeta /dist)
RUN npm run build

# Etapa 2: Servir archivos estáticos con nginx
FROM nginx:alpine
# Copiar el build al directorio público de nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Ejecutar nginx
CMD ["nginx", "-g", "daemon off;"]

