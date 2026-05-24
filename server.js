const express = require('express');
const path = require('path');
const fs = require('fs');
const Kavenegar = require('kavenegar');

const app = express();

app.use(express.json());
app.use(express.static('public'));

// ============================================
// CONFIGURATION — CHANGE THESE
// ============================================
const KAVENEGAR_API_KEY = '6A6435656E3339767344694C6D51555637714C556D6A4A6658313376434C3246794E687638396E586B626F3D'; // From Kavenegar dashboard

const YOUR_PHONE = '09133542826';      // You (the owner)
const CUSTOMER_PHONE = '09133542826';   // Your customer/partner
// The person who placed the order will get SMS at whatever number they enter in the form

const ORDERS_FILE = path.join(__dirname, 'orders.json');

// ============================================
// SMS FUNCTION
// ============================================
const api = Kavenegar.KavenegarApi({ apikey: KAVENEGAR_API_KEY });

function sendOrderSMS(phoneNumber, message) {
    api.Send({
        message: message,
        sender: '0018018949161', // Default Kavenegar sender number
        receptor: phoneNumber
    }, function(response, status) {
        console.log('SMS to', phoneNumber, '- Status:', status);
        if (response) {
            console.log('  Response:', JSON.stringify(response));
        }
    });
}

// ============================================
// ORDER STORAGE
// ============================================
function readOrders() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
        }
    } catch (err) {
        console.error('Error reading orders:', err);
    }
    return [];
}

function saveOrders(orders) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

// ============================================
// ORDER ENDPOINT
// ============================================
app.post('/api/submit-order', (req, res) => {
    const order = req.body;
    
    console.log('----------------------------------------');
    console.log('NEW ORDER RECEIVED!');
    console.log('----------------------------------------');
    console.log('Order ID:', order.orderId);
    console.log('Customer:', order.customer?.fullName);
    console.log('Phone:', order.customer?.phone);
    console.log('City:', order.customer?.city);
    console.log('Shape:', order.config?.shapeName);
    console.log('Material:', order.config?.materialName);
    console.log('Quantity:', order.customer?.quantity);
    console.log('Delivery:', order.customer?.delivery);
    console.log('----------------------------------------');
    
    // Save to file
    const orders = readOrders();
    orders.push(order);
    saveOrders(orders);
    console.log('Order saved. Total orders:', orders.length);
    
    // ==========================================
    // SEND 3 SMS MESSAGES
    // ==========================================
    
    // Build a short order summary for SMS
    const smsText = 
        `سفارش جدید: ${order.orderId}\n` +
        `مشتری: ${order.customer?.fullName}\n` +
        `محصول: ${order.config?.shapeName} ${order.config?.materialName}\n` +
        `تماس: ${order.customer?.phone}\n` +
        `تعداد: ${order.customer?.quantity}`;
    
    const smsTextForCustomer = 
        `${order.customer?.fullName} عزیز، سفارش شما با موفقیت ثبت شد.\n` +
        `شماره پیگیری: ${order.orderId}\n` +
        `کارشناسان ما تا ۲ ساعت آینده با شما تماس خواهند گرفت.\n` +
        `آهن آلات صنعتی غفاری`;
    
    // 1. SMS to YOU (the owner)
    console.log('Sending SMS to you...');
    sendOrderSMS(YOUR_PHONE, smsText);
    
    // 2. SMS to your CUSTOMER/PARTNER
    console.log('Sending SMS to partner...');
    sendOrderSMS(CUSTOMER_PHONE, smsText);
    
    // 3. SMS to the PERSON WHO ORDERED
    if (order.customer?.phone) {
        console.log('Sending SMS to orderer...');
        sendOrderSMS(order.customer.phone, smsTextForCustomer);
    }
    
    console.log('All SMS requests sent!');
    
    res.json({ 
        success: true, 
        message: 'Order received',
        orderId: order.orderId
    });
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
    console.log('Press Ctrl+C to stop');
});