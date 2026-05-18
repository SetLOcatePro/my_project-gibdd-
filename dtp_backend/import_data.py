import json
import psycopg2
from psycopg2.extras import execute_values

# Настройки подключения к твоей базе
DB_CONFIG = {
    "dbname": "your_db_name",
    "user": "postgres",
    "password": "your_password",
    "host": "localhost",
    "port": "5432"
}


def import_from_json(file_path):
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Если это GeoJSON, данные обычно в 'features'
    features = data.get('features', [])

    values = []
    for f in features:
        props = f.get('properties', {})
        geom = f.get('geometry', {})
        coords = geom.get('coordinates', [0, 0])

        values.append((
            coords[1],  # latitude
            coords[0],  # longitude
            f"POINT({coords[0]} {coords[1]})",  # geom
            props.get('accident_type', 'Не указано'),
            props.get('dead_count', 0),
            props.get('injured_count', 0),
            json.dumps(props)  # сохраняем весь JSON в extra_data
        ))

    # Массовая вставка для скорости
    query = """
        INSERT INTO accidents (latitude, longitude, geom, accident_type, dead_count, injured_count, extra_data)
        VALUES %s
    """
    execute_values(cur, query, values)

    conn.commit()
    cur.close()
    conn.close()
    print(f"Успешно импортировано {len(values)} записей!")


if __name__ == "__main__":
    import_from_json("path_to_your_file.json")  # Укажи путь к файлу