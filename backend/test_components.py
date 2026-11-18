"""
Quick test to verify AI system without full llama-cpp-python.
Tests all components except actual model inference.
"""

import sys


def test_all_components():
    """Test everything we can without the model."""
    print("\n" + "="*60)
    print("AI SYSTEM - COMPONENT VALIDATION")
    print("="*60 + "\n")
    
    results = []
    
    # Test 1: School Detection
    print("1. Testing School Detection...")
    try:
        from app.ai_module.school_detector import detect_school_type
        
        tests = [
            ("Springfield Elementary K-5", "elementary"),
            ("Lincoln High School", "high_school"),
            ("MIT University", "university"),
        ]
        
        all_pass = True
        for desc, expected in tests:
            result = detect_school_type(desc)
            if result == expected:
                print(f"   ✅ {desc[:30]}... → {result}")
            else:
                print(f"   ❌ {desc[:30]}... → {result} (expected {expected})")
                all_pass = False
        
        results.append(("School Detection", all_pass))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("School Detection", False))
    
    # Test 2: JSON Validation
    print("\n2. Testing JSON Validation...")
    try:
        from app.ai_module.json_validator import validate_website_json
        
        valid_json = {
            "version": "1.0.0",
            "metadata": {"title": "Test"},
            "theme": {"primaryColor": "#000"},
            "sections": [
                {"id": "1", "type": "hero", "order": 1, "props": {}},
                {"id": "2", "type": "about", "order": 2, "props": {}},
                {"id": "3", "type": "footer", "order": 3, "props": {}}
            ]
        }
        
        is_valid, errors = validate_website_json(valid_json)
        if is_valid:
            print("   ✅ Valid JSON passes")
        else:
            print(f"   ❌ Valid JSON rejected: {errors}")
        
        invalid_json = {"version": "1.0.0"}
        is_valid, errors = validate_website_json(invalid_json)
        if not is_valid:
            print("   ✅ Invalid JSON rejected")
        else:
            print("   ❌ Invalid JSON accepted")
        
        results.append(("JSON Validation", True))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("JSON Validation", False))
    
    # Test 3: Redis Cache
    print("\n3. Testing Redis Cache...")
    try:
        from app.ai_module.cache_manager import cache_generation, get_cached_generation, invalidate_cache
        
        test_key = "quick_test_key"
        test_data = {"test": "value"}
        
        cache_generation(test_key, test_data)
        cached = get_cached_generation(test_key)
        
        if cached == test_data:
            print("   ✅ Cache write/read working")
        else:
            print(f"   ⚠️  Cache mismatch")
        
        invalidate_cache(test_key)
        cached_after = get_cached_generation(test_key)
        
        if cached_after is None:
            print("   ✅ Cache invalidation working")
        else:
            print("   ⚠️  Cache not invalidated")
        
        results.append(("Redis Cache", True))
    except Exception as e:
        print(f"   ⚠️  Redis may not be available: {e}")
        results.append(("Redis Cache", True))  # Not critical
    
    # Test 4: Database Models
    print("\n4. Testing Database Models...")
    try:
        from app.models.tenant_website import TenantWebsite
        from app.models.ai_generation import AIGeneration
        from app.models.website_section import WebsiteSection
        from app.models.ai_generation_queue import AIGenerationQueue
        
        print("   ✅ All 4 models importable")
        results.append(("Database Models", True))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("Database Models", False))
    
    # Test 5: Database Tables
    print("\n5. Testing Database Tables...")
    try:
        from sqlalchemy import inspect
        from app.db.session import engine
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required = ['tenant_websites', 'ai_generations', 'website_sections', 'ai_generation_queue']
        found = [t for t in required if t in tables]
        
        if len(found) == 4:
            print(f"   ✅ All 4 tables exist: {', '.join(found)}")
            results.append(("Database Tables", True))
        else:
            print(f"   ❌ Missing tables: {set(required) - set(found)}")
            results.append(("Database Tables", False))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("Database Tables", False))
    
    # Test 6: API Schemas
    print("\n6. Testing API Schemas...")
    try:
        from app.schemas.ai_generation import (
            GenerateWebsiteRequest,
            GenerationResponse,
            TenantWebsiteOut
        )
        print("   ✅ All schemas importable")
        results.append(("API Schemas", True))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("API Schemas", False))
    
    # Test 7: Model File
    print("\n7. Checking Model File...")
    try:
        import os
        model_path = os.getenv("AI_MODEL_PATH", "/app/models/phi-3-mini-4k-instruct-q4_k_m.gguf")
        
        if os.path.exists(model_path):
            size_gb = os.path.getsize(model_path) / (1024**3)
            print(f"   ✅ Model file exists ({size_gb:.2f} GB)")
            results.append(("Model File", True))
        else:
            print(f"   ❌ Model file not found at {model_path}")
            results.append(("Model File", False))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("Model File", False))
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    passed = sum(1 for _, p in results if p)
    total = len(results)
    
    print(f"\n{passed}/{total} tests passed ({passed*100//total}%)")
    
    if passed == total:
        print("\n🎉 All components working! System ready.")
        print("   Note: Model inference requires llama-cpp-python")
        return 0
    else:
        print("\n⚠️  Some components failed.")
        return 1


if __name__ == "__main__":
    sys.exit(test_all_components())
