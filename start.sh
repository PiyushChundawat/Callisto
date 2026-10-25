    redis-server --daemonize yes --save "" --appendonly no --maxmemory 64mb
    until redis-cli ping > /dev/null 2>&1; do
      sleep 0.2
    done
    npx prisma migrate deploy
    exec node server.js