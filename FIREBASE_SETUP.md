# Configuración de Firebase para Iris Pagos

Para que la aplicación sincronice en tiempo real en la nube entre tu celular y el de Iris:

1. Entrá a [Firebase Console](https://console.firebase.google.com/) y creá un proyecto (ej: `iris-pagos`).
2. Creá una base de datos **Firestore Database** en modo de prueba (*Test mode*).
3. Agregá una aplicación Web (ícono `</>`) y copiá las credenciales.
4. Pegalas en tu archivo `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=iris-pagos.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=iris-pagos
VITE_FIREBASE_STORAGE_BUCKET=iris-pagos.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Reglas recomendadas de Firestore (para que funcione sin login obligatorio):

En la pestaña **Reglas** de Firestore:
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> **Nota:** La aplicación cuenta con modo híbrido. Si aún no colocaste las claves en el `.env`, funcionará automáticamente en modo local sin romperse, mostrando la etiqueta `Local`. Al agregar las credenciales, cambia automáticamente a `Nube`.
