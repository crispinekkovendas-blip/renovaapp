package br.com.renova.guia.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * O token do app guardado no aparelho, cifrado com uma chave do Android
 * Keystore (que não sai do aparelho). Se não der para decifrar — backup
 * restaurado em outro aparelho, chave apagada —, o app pede o login de novo.
 */
class TokenStore(context: Context) {
    data class Account(val token: String, val expiresAt: Long, val name: String)

    private val prefs = context.getSharedPreferences("renova_auth", Context.MODE_PRIVATE)

    fun load(): Account? {
        val cipherText = prefs.getString(KEY_TOKEN, null) ?: return null
        return try {
            Account(decrypt(cipherText), prefs.getLong(KEY_EXPIRES, 0), prefs.getString(KEY_NAME, "") ?: "")
        } catch (_: Exception) {
            clear()
            null
        }
    }

    fun save(account: Account) {
        prefs.edit()
            .putString(KEY_TOKEN, encrypt(account.token))
            .putLong(KEY_EXPIRES, account.expiresAt)
            .putString(KEY_NAME, account.name)
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (keyStore.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val data = cipher.iv + cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(data, Base64.NO_WRAP)
    }

    private fun decrypt(encoded: String): String {
        val data = Base64.decode(encoded, Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, data, 0, IV_SIZE))
        return String(cipher.doFinal(data, IV_SIZE, data.size - IV_SIZE), Charsets.UTF_8)
    }

    private companion object {
        const val KEYSTORE = "AndroidKeyStore"
        const val ALIAS = "renova_guia_token"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_SIZE = 12
        const val KEY_TOKEN = "token"
        const val KEY_EXPIRES = "expires"
        const val KEY_NAME = "name"
    }
}
