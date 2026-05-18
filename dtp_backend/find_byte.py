import psycopg2
import sys

# Патчим psycopg2 чтобы найти где именно читается плохой байт
original_open = open

def patched_open(file, mode='r', *args, **kwargs):
    print(f'Opening: {file}')
    return original_open(file, mode, *args, **kwargs)

import builtins
builtins.open = patched_open

conn = psycopg2.connect(
    host='127.0.0.1',
    port=5432,
    dbname='dtp_db',
    user='postgres',
    password='dtp12345'
)
print('OK!')
conn.close()