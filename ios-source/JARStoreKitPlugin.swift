// VOORBEREIDING: dit bestand is NIET automatisch in Xcode geregistreerd.
// NOG NIET gebruiken voor echte betalingen zonder de server-side JWS-verificatie.
import Foundation
import Capacitor
import StoreKit

@objc(JARStoreKitPlugin)
public class JARStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "JARStoreKitPlugin"
    public let jsName = "JARStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unfinishedPurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishAfterServerVerification", returnType: CAPPluginReturnPromise)
    ]

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let ids = call.getArray("productIds", String.self), !ids.isEmpty else {
            call.reject("productIds is verplicht"); return
        }
        Task {
            do {
                let products = try await Product.products(for: Set(ids))
                call.resolve(["products": products.map { p in
                    ["id": p.id, "name": p.displayName, "description": p.description, "displayPrice": p.displayPrice]
                }])
            } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), productId.hasPrefix("eu.justareminder.") else {
            call.reject("Ongeldig productId"); return
        }
        // De app heeft een server-side preflight nodig voordat deze methode wordt aangeroepen.
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("Product niet beschikbaar in App Store"); return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        // Niet finishen en geen rechten geven totdat Supabase de JWS
                        // cryptografisch heeft geverifieerd en het account heeft bijgewerkt.
                        call.resolve(["status": "server_verification_required",
                                      "productId": transaction.productID,
                                      "transactionId": String(transaction.id),
                                      "signedTransaction": verification.jwsRepresentation])
                    case .unverified(_, _): call.reject("StoreKit verificatie mislukt")
                    }
                case .pending: call.resolve(["status":"pending"])
                case .userCancelled: call.resolve(["status":"cancelled"])
                @unknown default: call.reject("Onbekende StoreKit status")
                }
            } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func unfinishedPurchases(_ call: CAPPluginCall) {
        Task {
            var transactions: [[String: String]] = []
            for await verification in Transaction.unfinished {
                if case .verified(let transaction) = verification {
                    transactions.append(["transactionId": String(transaction.id),
                                         "productId": transaction.productID,
                                         "signedTransaction": verification.jwsRepresentation])
                }
            }
            call.resolve(["transactions":transactions])
        }
    }

    @objc func finishAfterServerVerification(_ call: CAPPluginCall) {
        guard let transactionId = call.getString("transactionId"), let id = UInt64(transactionId) else {
            call.reject("transactionId ontbreekt"); return
        }
        // Dit is GEEN bewijs van serververificatie: JavaScript kan niet worden vertrouwd.
        // Verificatie en rechten-toekenning horen altijd bij Supabase, ongeacht deze call.
        Task {
            for await verification in Transaction.unfinished {
                if case .verified(let transaction) = verification, transaction.id == id {
                    await transaction.finish()
                    call.resolve(["finished":true]); return
                }
            }
            call.resolve(["finished":false])
        }
    }
}
