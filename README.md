# Simpl Dashboard API

Simpl Dashboard API is a RESTful service designed to display production information in a dashboard panel. It leverages a range of technologies for robust, scalable, and secure operations.

## Technologies

- **Express.js**: A web application framework for Node.js, designed for building web applications and APIs.
- **Sequelize**: A promise-based Node.js ORM for Postgres, MySQL, MariaDB, SQLite, and Microsoft SQL Server.
- **SQL Server Node.js Driver**: Used for database connectivity.
- **Joi**: A powerful schema description language and data validator for JavaScript.
- **PM2**: A production process manager for Node.js applications with a built-in load balancer.
- **Docker**: A platform for developing, shipping, and running applications.
- **Winston**: A logger for just about everything.
- **Winston Daily Rotate File**: A transport for winston which logs to a rotating file each day.

## Authentication

The API uses an external Identity Provider (IdP) for authentication, implementing a custom middleware to facilitate communication with the authentication service through a dedicated HTTP client.

## Development Environment

The project uses an `.env` file for environment-specific configurations, leveraging the `config` and `dotenv` node modules to load settings accordingly. A Dockerfile is included to simplify the process of running the API in a containerized environment.

## Logging

Logging is handled by Winston, configured with a daily rotate mechanism via the `winston-daily-rotate-file` module to ensure efficient log management.

## Database

Database access is facilitated through Sequelize and the tedious driver, providing a streamlined interface for SQL Server interactions.

## Setup

### Prerequisites

- Node.js (version as specified in `package.json`)
- Docker (optional, for containerized deployment)

### Installing Dependencies

Run `npm install` to install the project dependencies.

### Environment Variables

Create an `.env` file at the root of the project and define the following variables to match your development, testing, or production environments:

```yml
MSSQL_DATABASE_HOST=<your_sql_server_host>
MSSQL_DATABASE_PORT=<your_sql_server_port>
MSSQL_DATABASE_NAME=<your_database_name>
MSSQL_DATABASE_USER=<your_database_user>
MSSQL_DATABASE_PASSWORD=<your_database_password>
IDP_HOST=<your_idp_host>
```


### Running the Application

- **Development Mode**: `npm run dev`
- **Production Mode**: Using PM2, run `pm2 start pm2.json` for optimized performance and load balancing.
- **Docker**: Build and run the container using the provided `Dockerfile`.

## PM2 Configuration

The application is configured to run with 3 instances, balancing the load across them to ensure high availability and better resource management. This configuration can be adjusted in `pm2.json` as necessary.

## Docker Support

Dockerfiles for both development (`Dockerfile-dev`) and production (`Dockerfile`) are included, enabling easy deployment in containerized environments.

## Versioning

The current version of the project is `1.0.7` as specified in `package.json`, reflecting its readiness for production use.
