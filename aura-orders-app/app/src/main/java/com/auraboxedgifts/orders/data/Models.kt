package com.auraboxedgifts.orders.data

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: String? = null,
    val token: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginData(
    val token: String,
    val email: String
)

data class Order(
    val id: String,
    val userEmail: String? = null,
    val status: String? = null,
    val cart: Cart? = null,
    val shippingAddress: ShippingAddress? = null,
    val paymentStatus: String? = null,
    val paymentOrderId: String? = null,
    val paymentId: String? = null,
    val customer: Customer? = null,
    val notes: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class Cart(
    val lines: List<CartLine> = emptyList(),
    val subtotal: Double = 0.0,
    val shipping: Double = 0.0,
    val discount: Double = 0.0,
    val tax: Double = 0.0,
    val grandTotal: Double = 0.0,
    val currency: String = "INR"
)

data class CartLine(
    val productId: String? = null,
    val name: String? = null,
    val image: String? = null,
    val qty: Int = 1,
    val unitPrice: Double = 0.0,
    val lineTotal: Double = 0.0
)

data class Customer(
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null
)

data class ShippingAddress(
    val name: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null
)

data class UpdateOrderRequest(
    val status: String? = null,
    val notes: String? = null
)

enum class OrderStatus(val label: String, val apiValue: String) {
    CREATED("New", "created"),
    CONFIRMED("Confirmed", "confirmed"),
    PROCESSING("Processing", "processing"),
    SHIPPED("Shipped", "shipped"),
    DELIVERED("Delivered", "delivered"),
    CANCELLED("Cancelled", "cancelled");

    companion object {
        fun fromApi(value: String?): OrderStatus {
            return entries.find { it.apiValue == value?.lowercase() } ?: CREATED
        }
    }
}

fun Order.displayName(): String =
    customer?.name?.takeIf { it.isNotBlank() }
        ?: userEmail?.substringBefore("@")
        ?: "Customer"

fun Order.displayEmail(): String =
    customer?.email?.takeIf { it.isNotBlank() } ?: userEmail.orEmpty()

fun Order.displayPhone(): String = customer?.phone.orEmpty()

fun Order.displayAddress(): String {
    customer?.address?.takeIf { it.isNotBlank() }?.let { return it }
    shippingAddress?.let { addr ->
        return listOfNotNull(addr.address, addr.city, addr.state, addr.pincode)
            .filter { it.isNotBlank() }
            .joinToString(", ")
    }
    return ""
}

fun Order.isPaid(): Boolean = paymentStatus?.equals("paid", ignoreCase = true) == true

fun formatRupee(amount: Double): String =
    "₹%,.0f".format(amount).replace(",", ",")

data class Product(
    val id: String,
    val slug: String? = null,
    val name: String,
    val collection: String,
    val price: Double = 0.0,
    val image: String? = null,
    val description: String? = null,
    val tags: List<String>? = null
)

data class Collection(
    val slug: String,
    val name: String,
    val description: String? = null,
    val image: String? = null
)

data class UserProfile(
    val email: String? = null,
    val name: String? = null,
    val phone: String? = null,
    val isAdmin: Boolean = false,
    val hasPassword: Boolean = false
)

data class AuthTokenResponse(
    val success: Boolean,
    val token: String? = null,
    val email: String? = null,
    val user: UserProfile? = null,
    val error: String? = null,
    val message: String? = null
)

data class EmailCheckData(
    val exists: Boolean,
    val hasPassword: Boolean,
    val isAdmin: Boolean = false
)

data class OtpRequest(val email: String)
data class VerifyOtpRequest(val email: String, val otp: String)

data class ProductPayload(
    val id: String? = null,
    val slug: String? = null,
    val name: String,
    val collection: String,
    val price: Double,
    val image: String,
    val description: String? = null,
    val tags: List<String>? = null
)

data class DeleteResult(val deleted: Boolean)

data class UploadResult(
    val url: String,
    val absoluteUrl: String? = null,
    val filename: String? = null
)

data class CartCalculateRequest(val items: List<LocalCartItem>)
data class CartItemRequest(val productId: String, val qty: Int)

data class RazorpayOrderInfo(
    val id: String,
    val amount: Int,
    val currency: String? = null,
    val receipt: String? = null
)

data class CreateOrderResponse(
    val success: Boolean,
    val order: RazorpayOrderInfo? = null,
    val key_id: String? = null,
    val error: String? = null
)

data class VerifyPaymentRequest(
    val razorpay_order_id: String,
    val razorpay_payment_id: String,
    val razorpay_signature: String,
    val cartItems: List<CartItemRequest>,
    val customer: Customer
)

data class CheckoutInfo(
    val name: String = "",
    val phone: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val pincode: String = ""
)
