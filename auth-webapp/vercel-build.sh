#!/bin/bash

# Create env-config.js
echo "window.ENV = {" > ./public/env-config.js
echo "  FIREBASE_API_KEY: '$FIREBASE_API_KEY'," >> ./public/env-config.js
echo "  FIREBASE_AUTH_DOMAIN: '$FIREBASE_AUTH_DOMAIN'," >> ./public/env-config.js
echo "  FIREBASE_PROJECT_ID: '$FIREBASE_PROJECT_ID'," >> ./public/env-config.js
echo "  FIREBASE_STORAGE_BUCKET: '$FIREBASE_STORAGE_BUCKET'," >> ./public/env-config.js
echo "  FIREBASE_MESSAGING_SENDER_ID: '$FIREBASE_MESSAGING_SENDER_ID'," >> ./public/env-config.js
echo "  FIREBASE_APP_ID: '$FIREBASE_APP_ID'," >> ./public/env-config.js
echo "  FIREBASE_MEASUREMENT_ID: '$FIREBASE_MEASUREMENT_ID'" >> ./public/env-config.js
echo "};" >> ./public/env-config.js 