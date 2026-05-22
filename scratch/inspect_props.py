import sqlite3

def main():
    conn = sqlite3.connect('../sql_app.db')
    cursor = conn.cursor()
    
    # Get sample properties
    cursor.execute("SELECT id, parcel_id, address, county, state, assessed_value, amount_due, status FROM properties LIMIT 5;")
    rows = cursor.fetchall()
    print("Sample properties:")
    for row in rows:
        print(row)
        
    # Count properties per state
    cursor.execute("SELECT state, COUNT(*) FROM properties GROUP BY state;")
    states = cursor.fetchall()
    print("\nProperties per state:")
    for state in states:
        print(f"  {state[0]}: {state[1]}")
        
    # Count properties per county in FL or TX
    cursor.execute("SELECT county, state, COUNT(*), SUM(assessed_value), AVG(amount_due) FROM properties GROUP BY county, state HAVING COUNT(*) > 5 ORDER BY COUNT(*) DESC LIMIT 10;")
    counties = cursor.fetchall()
    print("\nTop counties:")
    for county in counties:
        print(f"  {county[0]}, {county[1]}: {county[2]} properties, total assessed {county[3]}, avg amount due {county[4]}")
        
    conn.close()

if __name__ == "__main__":
    main()
