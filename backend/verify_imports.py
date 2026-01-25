import sys
import os

# Add the current directory to sys.path so 'app' module can be found
sys.path.append(os.getcwd())

print("Verifying imports...")

try:
    from app.models.mark import Mark
    print("✅ app.models.mark.Mark imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Mark: {e}")

try:
    from app.models.result import Result
    print("✅ app.models.result.Result imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Result: {e}")

try:
    from app.models.fee_payment import FeePayment
    print("✅ app.models.fee_payment.FeePayment imported successfully")
except ImportError as e:
    print(f"❌ Failed to import FeePayment: {e}")

try:
    from app.models.fee_due import FeeDue
    print("✅ app.models.fee_due.FeeDue imported successfully")
except ImportError as e:
    print(f"❌ Failed to import FeeDue: {e}")

print("Verification complete.")
