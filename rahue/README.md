# Dashboard de Conteo

Aplicación Next.js que muestra un panel en tiempo real con datos provenientes de MongoDB.

## Requisitos

- Node.js 20+
- Archivo `.env` con las credenciales de la base de datos

## Variables de entorno

Crea un archivo `.env` basado en `.env.example` y completa la contraseña del usuario:

```env
MONGODB_URI=mongodb+srv://dsolerolguin_db_user:<db_password>@cluster0.mb8mawt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=counter_db
MONGODB_COLLECTION=counts_per_minute
```

## Librerías principales utilizadas

Las dependencias clave instaladas para el dashboard son:

- [`mongodb`](https://www.npmjs.com/package/mongodb): conexión con la base de datos.
- [`swr`](https://swr.vercel.app/): obtención de datos con refresco automático cada minuto.
- [`recharts`](https://recharts.org/en-US/): visualización gráfica del conteo.
- [`date-fns`](https://date-fns.org/): formateo de fechas y horas en español.

Estas librerías ya están incluidas en el proyecto. Si necesitas instalarlas manualmente ejecuta:

```bash
npm install mongodb swr recharts date-fns
```

## Desarrollo

```bash
npm run dev
```

El dashboard estará disponible en [http://localhost:3000](http://localhost:3000).

## Lint

```bash
npm run lint
```
