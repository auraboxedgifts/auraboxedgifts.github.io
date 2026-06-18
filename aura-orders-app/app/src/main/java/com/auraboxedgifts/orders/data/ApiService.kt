package com.auraboxedgifts.orders.data

import com.auraboxedgifts.orders.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface AuraApiService {
    @POST("/api/admin/login")
    suspend fun login(@Body body: LoginRequest): Response<ApiResponse<LoginData>>

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
}

class AuthInterceptor(private val tokenProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        val token = tokenProvider()
        val request = if (!token.isNullOrBlank()) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}

class AuraRepository(private val api: AuraApiService) {

    suspend fun login(email: String, password: String): LoginData {
        val response = api.login(LoginRequest(email.trim().lowercase(), password))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Login failed")
        }
        return body.data ?: throw ApiException("No token returned")
    }

    suspend fun fetchOrders(token: String): List<Order> {
        val response = api.getOrders("Bearer $token")
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load orders")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchOrder(token: String, id: String): Order {
        val response = api.getOrder("Bearer $token", id)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Order not found")
        }
        return body.data ?: throw ApiException("Order not found")
    }

    suspend fun updateOrderStatus(token: String, id: String, status: String): Order {
        val response = api.updateOrder("Bearer $token", id, UpdateOrderRequest(status = status))
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
