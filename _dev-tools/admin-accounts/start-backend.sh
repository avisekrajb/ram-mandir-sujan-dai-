#!/bin/bash
# Isolated test backend: own DB, own JWT secret, email + Cloudinary disabled.
SP="$(cd "$(dirname "$0")" && pwd)"
export SUPERADMIN_EMAIL=super@test.local
export SUPERADMIN_PASSWORD="$(node -e "console.log(require('$(cygpath -m "$SP")/creds.json').superadmin.password)")"
export PORT=5600
export MONGODB_URI=mongodb://127.0.0.1:27600/temple_admin_test
export JWT_SECRET=isolated-test-secret-5600
export NODE_ENV=development
export FRONTEND_URL=http://localhost:4600
export EMAIL_USER= EMAIL_PASS=
export CLOUDINARY_CLOUD_NAME= CLOUDINARY_API_KEY= CLOUDINARY_API_SECRET=
cd "/c/Users/Acer/Desktop/New folder/backend/backend" && exec node server.js
