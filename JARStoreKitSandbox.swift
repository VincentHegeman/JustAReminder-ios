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
        CAPPluginMethod(name: "unfinishedPurchases", returnType: CAPPluginReturnPromise)
    ]
    private let allowedIds: Set<String> = [
        "eu.justareminder.private.monthly.v2", "eu.justareminder.private.yearly",
        "eu.justareminder.premium.monthly", "eu.justareminder.premium.yearly",
        "eu.justareminder.extra50.monthly", "eu.justareminder.extra100.monthly",
        "eu.justareminder.extra150.monthly", "eu.justareminder.extra200.monthly"
    ]
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
                                      "productId":transaction.productID, "signedTransaction":result.jwsRepresentation])
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
                            "productId":transaction.productID, "signedTransaction":result.jwsRepresentation])
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
                        "productId":transaction.productID, "signedTransaction":result.jwsRepresentation])
                }
            }
            call.resolve(["transactions":transactions])
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
