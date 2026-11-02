import Foundation
import Capacitor
import StoreKit

// JAR-SK2-SANDBOX: no JS-derived entitlement. Only Apple's verified JWS goes to Supabase.
@objc(JARStoreKitPlugin)
public final class JARStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "JARStoreKitPlugin"
    public let jsName = "JARStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unfinishedPurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishAfterServerVerification", returnType: CAPPluginReturnPromise)
    ]
    private let allowedIds: Set<String> = [
        "eu.justareminder.private.monthly.v2", "eu.justareminder.private.yearly",
        "eu.justareminder.premium.monthly", "eu.justareminder.premium.yearly",
        "eu.justareminder.extra50.monthly", "eu.justareminder.extra100.monthly",
        "eu.justareminder.extra150.monthly", "eu.justareminder.extra200.monthly"
    ]
    // StoreKit Transaction.environment requires iOS 16+, while this app supports iOS 15.
    // The JWS payload supplies only an environment HINT; Supabase cryptographically verifies
    // the full signed transaction, app bundle and environment before recording a purchase.
    // An invalid/missing hint fails closed on the server, never grants rights.
    private func signedEnvironmentHint(_ signedJWS: String) -> String {
        let sections = signedJWS.split(separator: ".", omittingEmptySubsequences: false)
        guard sections.count == 3 else { return "Unknown" }
        var data64 = String(sections[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        data64 += String(repeating: "=", count: (4 - data64.count % 4) % 4)
        guard let decoded = Data(base64Encoded: data64),
              let json = try? JSONSerialization.jsonObject(with: decoded) as? [String: Any],
              let environment = json["environment"] as? String,
              environment == "Sandbox" || environment == "Production"
        else { return "Unknown" }
        return environment
    }
    @objc public func getProducts(_ call: CAPPluginCall) {
        let ids = (call.getArray("productIds", String.self) ?? []).filter { allowedIds.contains($0) }
        guard !ids.isEmpty else { call.reject("Geen geldig Apple-product geselecteerd"); return }
        Task {
            do {
                let products = try await Product.products(for: Set(ids))
                call.resolve(["products": products.map { p in
                    ["id":p.id, "displayName":p.displayName, "displayPrice":p.displayPrice,
                     "description":p.description] as [String:String]
                }])
            } catch { call.reject("Producten ophalen mislukt: \(error.localizedDescription)") }
        }
    }
    @objc public func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), allowedIds.contains(productId),
              let accountId = call.getString("accountId"),
              let accountUUID = UUID(uuidString: accountId) else {
            call.reject("Je moet zijn ingelogd om een bekend product te kopen"); return
        }
        Task {
            do {
                guard let product = try await Product.products(for:[productId]).first else {
                    call.reject("Apple heeft dit product niet beschikbaar"); return
                }
                let result = try await product.purchase(options:[.appAccountToken(accountUUID)])
                switch result {
                case .success(let result):
                    switch result {
                    case .verified(let transaction):
                        call.resolve(["status":"verify_on_server", "transactionId":String(transaction.id),
                                      "productId":transaction.productID, "environment":signedEnvironmentHint(result.jwsRepresentation), "signedTransaction":result.jwsRepresentation])
                        // NEVER finish before the backend has proved delivery of paid rights.
                    case .unverified: call.reject("De Apple-transactie is niet geverifieerd")
                    }
                case .pending: call.resolve(["status":"pending"])
                case .userCancelled: call.resolve(["status":"cancelled"])
                @unknown default: call.reject("Onbekende Apple-aankoopstatus")
                }
            } catch { call.reject("Apple-aankoop mislukt: \(error.localizedDescription)") }
        }
    }
    @objc public func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                // This can display an Apple login prompt. Invoke only from a user action.
                try await AppStore.sync()
                var transactions: [[String:String]] = []
                for await result in Transaction.currentEntitlements {
                    if case .verified(let transaction) = result, allowedIds.contains(transaction.productID) {
                        transactions.append(["transactionId":String(transaction.id),
                            "productId":transaction.productID, "environment":signedEnvironmentHint(result.jwsRepresentation), "signedTransaction":result.jwsRepresentation])
                    }
                }
                call.resolve(["transactions":transactions])
            } catch { call.reject("Aankopen herstellen mislukt: \(error.localizedDescription)") }
        }
    }
    @objc public func unfinishedPurchases(_ call: CAPPluginCall) {
        Task {
            var transactions: [[String:String]] = []
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result, allowedIds.contains(transaction.productID) {
                    transactions.append(["transactionId":String(transaction.id),
                        "productId":transaction.productID, "environment":signedEnvironmentHint(result.jwsRepresentation), "signedTransaction":result.jwsRepresentation])
                }
            }
            call.resolve(["transactions":transactions])
        }
    }

    @objc public func finishAfterServerVerification(_ call: CAPPluginCall) {
        guard let rawId = call.getString("transactionId"),
              let transactionId = UInt64(rawId) else {
            call.reject("Transaction-ID ontbreekt"); return
        }
        // The caller MUST first receive verified=true, recorded=true and
        // rightsReady=true from jar-apple-verify. No entitlement in this plugin.
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result,
                   transaction.id == transactionId,
                   allowedIds.contains(transaction.productID) {
                    await transaction.finish()
                    call.resolve(["finished":true]); return
                }
            }
            call.resolve(["finished":false])
        }
    }

}

// Register local Capacitor plugin without changing SPM dependencies.
@objc(JARBridgeViewController)
public final class JARBridgeViewController: CAPBridgeViewController {
    override public func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(JARStoreKitPlugin())
    }
}
