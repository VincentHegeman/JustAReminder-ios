// Xcode template. Voeg beide Swift-bestanden in ios/App/App toe,
// selecteer App target en zet de custom class van de CAPBridgeViewController
// in het Storyboard op JARBridgeViewController.
import Capacitor

@objc(JARBridgeViewController)
public class JARBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(JARStoreKitPlugin())
    }
}
