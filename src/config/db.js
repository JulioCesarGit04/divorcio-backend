const sql = require('mssql');

const config = {
    user: 'sa',
    password: '123456', 
    server: 'localhost', 
    database: 'DivorcioMunicipal', 
    port: 1433, 
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

let poolPromise;

function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(config)
            .then(pool => {
                console.log(" Conexión a SQL Server establecida exitosamente...");
                return pool;
            })
            .catch(err => {
                console.error(" Error al conectar a SQL Server:", err.message);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
}

module.exports = {
    getPool,
    sql
};

getPool();