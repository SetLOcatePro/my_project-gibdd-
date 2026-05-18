import psycopg2
import sys

print("=" * 50)
print("🔍 ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К PostgreSQL")
print("=" * 50)

# Пробуем разные варианты подключения
configs = [
    {"host": "localhost", "database": "postgres", "user": "postgres", "password": "postgres"},
    {"host": "127.0.0.1", "database": "postgres", "user": "postgres", "password": "postgres"},
    {"host": "localhost", "database": "dtp_db", "user": "postgres", "password": "postgres"},
]

for i, config in enumerate(configs, 1):
    print(f"\n📌 Попытка {i}: {config['host']} / {config['database']}")
    try:
        conn = psycopg2.connect(**config)
        print(f"   ✅ УСПЕХ! Подключено к базе '{config['database']}'")
        print(f"   💡 Используй эти данные в database.py:")
        print(f"   DATABASE_URL = \"postgresql://postgres:postgres@{config['host']}:5432/{config['database']}\"")
        conn.close()
        sys.exit(0)
    except psycopg2.OperationalError as e:
        print(f"   ❌ Ошибка: {e}")
    except Exception as e:
        print(f"   ❌ Неизвестная ошибка: {type(e).__name__}: {e}")

print("\n" + "=" * 50)
print("⚠️  НИ ОДНА ПОПЫТКА НЕ УДАЛАСЬ!")
print("=" * 50)
print("\nВозможные решения:")
print("1. Запусти PostgreSQL через службы (services.msc)")
print("2. Проверь пароль в PGAdmin")
print("3. Создай базу 'dtp_db' в PGAdmin")