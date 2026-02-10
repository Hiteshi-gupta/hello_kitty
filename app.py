from flask import Flask, render_template, request, redirect, session, flash, jsonify
import json
import mysql.connector
import os

app = Flask(__name__)
app.secret_key = "myverysecretkey123"


#Database Connection
# def get_db():
#     return mysql.connector.connect(
#         host="localhost",
#         user="root",
#         password="hiteshi3103",
#         database="orderWeb"
#     )
import os
import mysql.connector
def get_db():
 conn = mysql.connector.connect(
    host=os.getenv("mysql.railway.internal"),
    user=os.getenv("root"),
    password=os.getenv("tSSysXgkpkInTFqaWtcZljLtiywHPoWA"),
    database=os.getenv("3306"),
    port=int(os.getenv("MYSQLPORT"))
)

 cursor = conn.cursor()


@app.route('/')
def home():
    if 'email' not in session:
       return redirect('/login')
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT full_name FROM login WHERE email = %s",(session['email'],))
    user = cursor.fetchone()

    return render_template("index.html", user=user)



@app.route('/login', methods = ['GET','POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        conn = get_db()
        cursor = conn.cursor(dictionary = True)
        cursor.execute("SELECT * FROM login WHERE email = %s",(email,))
        user = cursor.fetchone()

        if user and user['password'] == password:
            session['email'] = user['email']
            return redirect('/')
        else:
            return "Invalid email or password"
    
    return render_template("login.html")

@app.route('/register', methods = ['GET', 'POST'])
def register():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        password = request.form.get('password')

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO login(full_name,email,password) VALUES (%s,%s,%s)",(full_name,email,password))
        conn.commit()
        return redirect('/login')
    
    return render_template("register.html")

@app.route('/contact',methods=['POST'])
def contact_form():
    if request.method == 'POST':
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        email= request.form.get('email')
        message = request.form.get('message')
        
        conn=get_db()
        cursor=conn.cursor()
        cursor.execute(
            "INSERT INTO contact_messages(first_name,last_name,email,message) VALUES (%s,%s,%s,%s)",(first_name,last_name,email,message))
        conn.commit()

        flash("Thank You for contacting us. We will get back to you soon.","contact_success")
        return redirect('/#contact')

@app.route('/checkout', methods=['POST'])
def checkout():
    if 'email' not in session:
        return redirect('/login')

    conn = get_db()
    cursor = conn.cursor()

    total_amount = request.form.get('total_amount')
    cart_data = request.form.get('cart_data')

    # 🚫 Stop empty cart orders
    if not total_amount or float(total_amount) == 0:
        flash("Your cart is empty. Add items before placing an order.", "order_error")
        return redirect('/')

    # 🚫 Stop if cart data missing
    if not cart_data:
        flash("Cart data missing. Please try again.", "order_error")
        return redirect('/')

    try:
        items = json.loads(cart_data)
    except json.JSONDecodeError:
        flash("Cart data corrupted. Please try again.", "order_error")
        return redirect('/')

    # ✅ Save order
    cursor.execute(
        "INSERT INTO orders(user_email,total_amount) VALUES (%s,%s)",
        (session['email'], total_amount)
    )
    conn.commit()
    order_id = cursor.lastrowid

    # ✅ Save order items
    for item in items:
        cursor.execute(
            "INSERT INTO order_items(order_id, product_name, quantity, price, image) VALUES (%s,%s,%s,%s,%s)",
            (order_id, item['name'], item['quantity'], item['price'], item['image'])
        )

    conn.commit()

    flash({"order_id": order_id, "total": total_amount}, "order_success")
    return redirect('/')

@app.route('/orders')
def orders():
    if 'email' not in session:
        return redirect('/login')
    
    user_email = session['email']
    conn=get_db()
    cursor=conn.cursor(dictionary=True)

    cursor.execute(
     "SELECT * FROM orders WHERE user_email = %s ORDER BY created_at DESC",
     (user_email,)

     )

    orders=cursor.fetchall()
    for order in orders:
        cursor.execute(
        "SELECT product_name, quantity,price, image FROM order_items WHERE order_id = %s",
        (order['id'],)
        )
        order['order_items'] = cursor.fetchall()

    return render_template('orders.html',orders=orders)
    
@app.route('/contact', methods = ['GET'])
def contact_get():
    return redirect('/')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/profile', methods = ['GET', 'POST'])
def profile():
    if 'email' not in session:
        return redirect('/login')
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        phone = request.form.get('phone')
        address = request.form.get('address')
        city = request.form.get('city')
        pincode = request.form.get('pincode')

        cursor.execute(
            "UPDATE login SET phone = %s, address = %s, city = %s, pincode = %s WHERE email = %s",
            (phone, address, city, pincode, session['email'])
        )
        conn.commit()
    cursor.execute("SELECT * FROM login WHERE email = %s",(session['email'],))
    user = cursor.fetchone()

    return render_template('profile.html', user=user)

@app.route('/add-to-wishlist', methods=['POST'])
def add_to_wishlist():
    if 'email' not in session:
        return jsonify({'message': 'Please login first'})

    data = request.get_json()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO wishlist(user_email, product_name, price, image)
        VALUES (%s,%s,%s,%s)
    """, (session['email'], data['name'], int(''.join(filter(str.isdigit, data['price']))), data['image']))

    conn.commit()
    return jsonify({'message': 'Added to wishlist!'})

@app.route('/wishlist')
def wishlist():
    if 'email' not in session:
        return redirect('/login')

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM wishlist WHERE user_email=%s", (session['email'],))
    items = cursor.fetchall()

    return render_template('wishlist.html', items=items)

@app.route('/remove-from-wishlist', methods=['POST'])
def remove_from_wishlist():
    if 'email' not in session:
        return '', 403

    data = request.get_json()
    product_name = data.get('name')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM wishlist WHERE user_email=%s AND product_name=%s",
        (session['email'], product_name)
    )
    conn.commit()

    return '', 204




if __name__ == '__main__':
    app.run()