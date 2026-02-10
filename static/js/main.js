document.addEventListener("DOMContentLoaded", function () {

    const cartIcon = document.querySelector('.cart-icon');
    const cartTab = document.querySelector('.cart-tab');
    const cartClose = document.querySelector('.close-btn');
    const cardList = document.querySelector('.card-list');
    const cartList = document.querySelector('.cart-list');
    const cartTotal = document.querySelector('.cart-total');
    const cartValue = document.querySelector('.cart-value');
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const bars = document.querySelector('.fa-bars');
    const checkoutForm = document.querySelector("#checkoutForm");
    const profileMenu = document.querySelector('.profile-menu');
    const dropdown = document.querySelector('.profile-dropdown');
    const profileIcon = document.querySelector(".profile-icon");

    if (cartIcon) cartIcon.addEventListener('click', () => cartTab.classList.add('cart-tab-active'));
    if (cartClose) cartClose.addEventListener('click', () => cartTab.classList.remove('cart-tab-active'));
    if (hamburger) hamburger.addEventListener('click', () => mobileMenu.classList.toggle('mobile-menu-active'));
    if (hamburger) hamburger.addEventListener('click', () => bars.classList.toggle('fa-xmark'));

    // Profile dropdown
    if (profileIcon && dropdown) {
        profileIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener('click', () => {
            dropdown.style.display = "none";
        });
    }

    document.querySelectorAll('.move-cart-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();

            const product = {
                name: this.dataset.name,
                price: this.dataset.price + " Rs.",
                image: this.dataset.image
            };

            // Add to cart visually
            addToCart(product);

            // Remove from wishlist database
            fetch('/remove-from-wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: product.name })
            }).then(() => {
                // Remove card from page
                this.closest('.order-card').remove();
            });
        });
    });


    let productList = [];
    let cartProduct = [];

    const updateTotals = () => {
        let totalPrice = 0;
        let totalQuantity = 0;

        document.querySelectorAll('.item').forEach(item => {
            const quantity = parseInt(item.querySelector('.quantity-value').textContent);
            const price = parseInt(item.querySelector('.item-total').textContent.replace(/[^\d]/g, ''));
            totalPrice += price;
            totalQuantity += quantity;
        });

        if (cartTotal) cartTotal.textContent = `${totalPrice} Rs.`;
        if (cartValue) cartValue.textContent = totalQuantity;
    };

    const showCards = () => {
        if (!cardList) return;

        productList.forEach(product => {
            const orderCard = document.createElement('div');
            orderCard.classList.add('order-card');

            orderCard.innerHTML = `
                <div class="card-image">
                    <img src="${product.image}" alt="${product.name}">
                    <a href="#" class="wishlist-btn">♡</a>
                </div>

                <div class="card-info">
                    <h4 class="product-name">${product.name}</h4>
                    <h4 class="price">${product.price}</h4>
                </div>

                <a href="#" class="btn card-btn">Add to Cart</a>
            `;

            cardList.appendChild(orderCard);

            // ❤️ Wishlist
            const heart = orderCard.querySelector('.wishlist-btn');
            heart.addEventListener('click', (e) => {
                e.preventDefault();

                fetch('/add-to-wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                })
                    .then(res => res.json())
                    .then(() => heart.classList.add('wishlisted'));
            });

            // 🛒 Cart
            orderCard.querySelector('.card-btn').addEventListener('click', (e) => {
                e.preventDefault();
                addToCart(product);
            });
        });
    };

    const addToCart = (product) => {
        if (!cartList) return;

        const existingProduct = cartProduct.find(item => item.id === product.id);
        if (existingProduct) {
            alert('Item already in your cart!');
            return;
        }

        cartProduct.push(product);
        let quantity = 1;
        let price = parseInt(product.price.replace(/[^\d]/g, ''), 10);

        const cartItem = document.createElement('div');
        cartItem.classList.add('item');

        cartItem.innerHTML = `
           <div class="item-image"><img src="${product.image}"></div>
           <div class="detail">
               <h4>${product.name}</h4>
               <h4 class="item-total">${price} Rs.</h4>
           </div>
           <div class="flex">
               <a href="#" class="quantity-btn minus">-</a>
               <h4 class="quantity-value">${quantity}</h4>
               <a href="#" class="quantity-btn plus">+</a>
           </div>
        `;

        cartList.appendChild(cartItem);
        updateTotals();

        const plusBtn = cartItem.querySelector('.plus');
        const minusBtn = cartItem.querySelector('.minus');
        const quantityValue = cartItem.querySelector('.quantity-value');
        const itemTotal = cartItem.querySelector('.item-total');

        plusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            quantity++;
            quantityValue.textContent = quantity;
            itemTotal.textContent = `${price * quantity} Rs.`;
            updateTotals();
        });

        minusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (quantity > 1) {
                quantity--;
                quantityValue.textContent = quantity;
                itemTotal.textContent = `${price * quantity} Rs.`;
                updateTotals();
            } else {
                cartItem.remove();
                cartProduct = cartProduct.filter(item => item.id !== product.id);
                updateTotals();
            }
        });
    };

    // Checkout
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", (e) => {
            const cartItems = document.querySelectorAll(".cart-list .item");
            if (cartItems.length === 0) {
                e.preventDefault();
                alert("Your cart is empty!");
                return;
            }

            const totalElement = document.querySelector(".cart-total");
            const totalInput = document.getElementById("totalAmountInput");
            const cartInput = document.getElementById("cartDataInput");

            const total = parseInt(totalElement.textContent.replace(/[^\d]/g, ''), 10);
            totalInput.value = total;

            const cartArray = [];
            cartItems.forEach(item => {
                const name = item.querySelector(".detail h4").textContent.trim();
                const quantity = item.querySelector(".quantity-value").textContent.trim();
                const price = parseInt(item.querySelector(".item-total").textContent.replace(/[^\d]/g, ''), 10);
                const image = item.querySelector("img").getAttribute("src");

                cartArray.push({ name, quantity, price, image });
            });

            cartInput.value = JSON.stringify(cartArray);
        });
    }

    fetch('/static/products.json')
        .then(response => response.json())
        .then(data => {
            productList = data;
            showCards();
        });

});
