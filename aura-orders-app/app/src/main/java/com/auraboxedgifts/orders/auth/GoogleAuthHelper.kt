package com.auraboxedgifts.orders.auth

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException

class GoogleAuthCancelledException : Exception("Google Sign-In cancelled")
class GoogleAuthUnavailableException(message: String) : Exception(message)

object GoogleAuthHelper {

    suspend fun requestIdToken(activity: Activity, serverClientId: String): String {
        val clientId = serverClientId.trim()
        if (clientId.isEmpty()) {
            throw GoogleAuthUnavailableException("Google Sign-In is not configured")
        }

        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(clientId)
            .setAutoSelectEnabled(false)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val credentialManager = CredentialManager.create(activity)
        try {
            val result = credentialManager.getCredential(
                context = activity,
                request = request
            )
            val credential = result.credential
            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken
                if (idToken.isBlank()) {
                    throw GoogleAuthUnavailableException("Google did not return an ID token")
                }
                return idToken
            }
            throw GoogleAuthUnavailableException("Unexpected Google credential type")
        } catch (e: GetCredentialCancellationException) {
            throw GoogleAuthCancelledException()
        } catch (e: NoCredentialException) {
            throw GoogleAuthUnavailableException(
                "No Google account available. Add a Google account on this device and try again."
            )
        } catch (e: GoogleIdTokenParsingException) {
            throw GoogleAuthUnavailableException("Could not read Google Sign-In response")
        }
    }
}
