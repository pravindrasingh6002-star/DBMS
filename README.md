# Stockly - E-commerce Order & Inventory Management (DBMS Capstone)

React (Vite) frontend + Node/Express backend + MySQL database.

```
stockly/
  database/   schema.sql                <- tables, constraints, views
  backend/    Express API, seed/        <- talks to MySQL; seed/ creates sample data
  frontend/   React app
  package.json, .node-version           <- used when deploying online (see below)
```

## Run it on your laptop

1. **Database** - from the `stockly` folder (Command Prompt, not PowerShell):
   ```
   mysql -u root -p < database\schema.sql
   ```
2. **Backend**
   ```
   cd backend
   copy .env.example .env     (then edit .env and put YOUR MySQL password)
   npm install
   npm run seed               (fills the database with sample data)
   npm run dev
   ```
3. **Frontend** (new terminal)
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Open http://localhost:5173

## Put it online (optional)

Build command: `npm run build` - Start command: `npm start` - the one Express server
delivers both the website and the API. The database settings (`DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`) are set as environment variables
on the hosting service. To create the tables and sample data in a cloud database, put
its details in `backend/.env.cloud` and run `npm run cloud:setup` then `npm run cloud:seed`.
