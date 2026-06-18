package com.auraboxedgifts.orders.data

import com.auraboxedgifts.orders.BuildConfig
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import java.io.File
import java.util.concurrent.TimeUnit

interface AuraApiService {
    @POST("/api/admin/login")
    suspend fun adminLogin(@Body body: LoginRequest): Response<ApiResponse<LoginData>>

    @GET("/api/admin/orders")
    suspend fun getOrders(@Header("Authorization") auth: String): Response<ApiResponse<List<Order>>>

    @GET("/api/admin/orders/{id}")
    suspend fun getOrder(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): Response<ApiResponse<Order>>

    @PATCH("/api/admin/orders/{id}")
    suspend fun updateOrder(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: UpdateOrderRequest
    ): Response<ApiResponse<Order>>

    @GET("/api/products")
    suspend fun getProducts(): Response<ApiResponse<List<Product>>>

    @GET("/api/collections")
    suspend fun getCollections(): Response<ApiResponse<List<Collection>>>

    @POST("/api/admin/products")
    suspend fun createProduct(
        @Header("Authorization") auth: String,
        @Body body: ProductPayload
    ): Response<ApiResponse<Product>>

    @PUT("/api/admin/products/{id}")
    suspend fun updateProduct(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: ProductPayload
    ): Response<ApiResponse<Product>>

    @DELETE("/api/admin/products/{id}")
    suspend fun deleteProduct(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): Response<ApiResponse<DeleteResult>>

    @Multipart
    @POST("/api/admin/upload")
    suspend fun uploadImage(
        @Header("Authorization") auth: String,
        @Part image: MultipartBody.Part
    ): Response<ApiResponse<UploadResult>>

    @POST("/api/auth/login")
    suspend fun customerLogin(@Body body: LoginRequest): Response<AuthTokenResponse>

    @POST("/api/auth/send-otp")
    suspend fun sendOtp(@Body body: OtpRequest): Response<AuthTokenResponse>

    @POST("/api/auth/verify-otp")
    suspend fun verifyOtp(@Body body: VerifyOtpRequest): Response<AuthTokenResponse>

    @GET("/api/auth/me")
    suspend fun getMe(@Header("Authorization") auth: String): Response<ApiResponse<UserProfile>>

    @GET("/api/orders")
    suspend fun getCustomerOrders(@Header("Authorization") auth: String): Response<ApiResponse<List<Order>>>

    @POST("/api/cart/calculate")
    suspend fun calculateCart(@Body body: Map<String, List<CartItemRequest>>): Response<ApiResponse<Cart>>

    @POST("/api/create-order")
    suspend fun createPaymentOrder(@Body body: Map<String, List<CartItemRequest>>): Response<CreateOrderResponse>

    @POST("/api/verify-payment")
    suspend fun verifyPayment(@Body body: VerifyPaymentRequest): Response<ApiResponse<Order>>
}

class AuraRepository(private val api: AuraApiService) {

    private fun bearer(token: String) = "Bearer $token"

    suspend fun login(email: String, password: String): LoginData {
        val response = api.adminLogin(LoginRequest(email.trim().lowercase(), password))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Login failed")
        }
        return body.data ?: throw ApiException("No token returned")
    }

    suspend fun customerLogin(email: String, password: String): Pair<String, UserProfile?> {
        val response = api.customerLogin(LoginRequest(email.trim().lowercase(), password))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.token.isNullOrBlank()) {
            throw ApiException(body?.error ?: "Login failed")
        }
        return body.token to body.user
    }

    suspend fun sendOtp(email: String) {
        val response = api.sendOtp(OtpRequest(email.trim().lowercase()))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: body?.message ?: "Could not send OTP")
        }
    }

    suspend fun verifyOtp(email: String, otp: String): Pair<String, UserProfile?> {
        val response = api.verifyOtp(VerifyOtpRequest(email.trim().lowercase(), otp.trim()))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.token.isNullOrBlank()) {
            throw ApiException(body?.error ?: "Invalid OTP")
        }
        return body.token to body.user
    }

    suspend fun fetchCustomerOrders(token: String): List<Order> {
        val response = api.getCustomerOrders(bearer(token))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load orders")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchOrders(token: String): List<Order> {
        val response = api.getOrders(bearer(token))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load orders")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchOrder(token: String, id: String): Order {
        val response = api.getOrder(bearer(token), id)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Order not found")
        }
        return body.data ?: throw ApiException("Order not found")
    }

    suspend fun updateOrderStatus(token: String, id: String, status: String): Order {
        val response = api.updateOrder(bearer(token), id, UpdateOrderRequest(status = status))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not update order")
        }
        return body.data ?: throw ApiException("Update failed")
    }

    suspend fun fetchProducts(): List<Product> {
        val response = api.getProducts()
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load products")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchCollections(): List<Collection> {
        val response = api.getCollections()
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load collections")
        }
        return body.data ?: emptyList()
    }

    suspend fun createProduct(token: String, payload: ProductPayload): Product {
        val response = api.createProduct(bearer(token), payload)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not create product")
        }
        return body.data ?: throw ApiException("Create failed")
    }

    suspend fun updateProduct(token: String, id: String, payload: ProductPayload): Product {
        val response = api.updateProduct(bearer(token), id, payload)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not update product")
        }
        return body.data ?: throw ApiException("Update failed")
    }

    suspend fun deleteProduct(token: String, id: String) {
        val response = api.deleteProduct(bearer(token), id)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not delete product")
        }
    }

    suspend fun uploadImage(token: String, file: File, mimeType: String): UploadResult {
        val requestBody = file.asRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("image", file.name, requestBody)
        val response = api.uploadImage(bearer(token), part)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Upload failed")
        }
        return body.data ?: throw ApiException("Upload failed")
    }

    suspend fun calculateCart(items: List<LocalCartItem>): Cart {
        val response = api.calculateCart(mapOf("items" to items.map { CartItemRequest(it.productId, it.qty) }))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not calculate cart")
        }
        return body.data ?: Cart()
    }

    suspend fun createPaymentOrder(items: List<LocalCartItem>): Pair<RazorpayOrderInfo, String> {
        val response = api.createPaymentOrder(mapOf("items" to items.map { CartItemRequest(it.productId, it.qty) }))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.order == null || body.key_id.isNullOrBlank()) {
            throw ApiException(body?.error ?: "Could not create payment order")
        }
        return body.order to body.key_id
    }

    suspend fun verifyPayment(request: VerifyPaymentRequest): Order {
        val response = api.verifyPayment(request)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Payment verification failed")
        }
        return body.data ?: throw ApiException("Payment verification failed")
    }
}

class ApiException(message: String) : Exception(message)

object ApiClient {
    fun create(): AuraApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuraApiService::class.java)
    }
}
