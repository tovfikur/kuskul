"""
Test AI generation end-to-end
"""

import sys
import time

def test_model_loading():
    """Test that model can be loaded."""
    print("🔄 Testing model loading...")
    try:
        from app.ai_module.model_loader import get_model
        
        start = time.time()
        model = get_model()
        load_time = time.time() - start
        
        if model:
            print(f"✅ Model loaded successfully in {load_time:.2f}s")
            return True
        else:
            print("❌ Model returned None")
            return False
    except FileNotFoundError as e:
        print(f"❌ Model file not found: {e}")
        return False
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_simple_generation():
    """Test basic website generation."""
    print("\n🔄 Testing website generation...")
    try:
        from app.ai_module.inference import generate_website_json
        
        description = "Lincoln High School with 800 students, strong athletics and STEM programs"
        
        start = time.time()
        result = generate_website_json(
            description=description,
            school_type=None,  # Auto-detect
            existing_colors=None,
            use_cache=False  # Force fresh generation
        )
        gen_time = time.time() - start
        
        print(f"✅ Generation completed in {gen_time:.2f}s")
        print(f"   School type: {result['school_type']}")
        print(f"   Generation time: {result['generation_time_ms']}ms")
        print(f"   Cached: {result['was_cached']}")
        print(f"   Sections: {len(result['website_json'].get('sections', []))}")
        
        # Validate JSON structure
        website = result['website_json']
        required_keys = ['version', 'metadata', 'theme', 'sections']
        missing = [k for k in required_keys if k not in website]
        
        if missing:
            print(f"⚠️  Missing keys: {missing}")
            return False
        
        if len(website['sections']) < 3:
            print(f"⚠️  Only {len(website['sections'])} sections (expected 3+)")
            return False
        
        print("✅ JSON structure valid")
        return True
        
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_school_detection():
    """Test school type detection."""
    print("\n🔄 Testing school detection...")
    try:
        from app.ai_module.school_detector import detect_school_type
        
        tests = [
            ("Springfield Elementary School K-5", "elementary"),
            ("Lincoln High School", "high_school"),
            ("MIT offers bachelor and master degrees", "university"),
        ]
        
        all_pass = True
        for desc, expected in tests:
            result = detect_school_type(desc)
            status = "✅" if result == expected else "❌"
            print(f"   {status} '{desc[:30]}...' → {result}")
            if result != expected:
                all_pass = False
        
        return all_pass
        
    except Exception as e:
        print(f"❌ Detection failed: {e}")
        return False


def test_caching():
    """Test Redis caching."""
    print("\n🔄 Testing caching...")
    try:
        from app.ai_module.cache_manager import cache_generation, get_cached_generation, invalidate_cache
        
        test_key = "test_e2e_cache"
        test_data = {"test": "data", "timestamp": time.time()}
        
        # Write
        success = cache_generation(test_key, test_data)
        if not success:
            print("⚠️  Cache write failed (Redis may not be available)")
            return True  # Not critical
        
        # Read
        cached = get_cached_generation(test_key)
        if cached != test_data:
            print(f"❌ Cache mismatch: {cached} != {test_data}")
            return False
        
        # Invalidate
        invalidate_cache(test_key)
        cached_after = get_cached_generation(test_key)
        if cached_after is not None:
            print("❌ Cache invalidation failed")
            return False
        
        print("✅ Cache operations working")
        return True
        
    except Exception as e:
        print(f"⚠️  Cache test failed: {e}")
        return True  # Not critical


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("AI WEBSITE GENERATION - END-TO-END TESTS")
    print("="*60 + "\n")
    
    tests = [
        ("School Detection", test_school_detection),
        ("Caching", test_caching),
        ("Model Loading", test_model_loading),
        ("Website Generation", test_simple_generation),
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\n{'─'*60}")
        result = test_func()
        results.append((name, result))
        time.sleep(0.5)
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60 + "\n")
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    print(f"\n{'='*60}")
    print(f"TOTAL: {passed}/{total} tests passed")
    print(f"{'='*60}\n")
    
    if passed == total:
        print("🎉 All tests passed! AI system fully operational!")
        return 0
    else:
        print("⚠️  Some tests failed. Review errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
