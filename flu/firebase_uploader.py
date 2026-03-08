"""
4단계: Firebase 저장
- AI 분석된 데이터를 Firebase Firestore에 저장
- 배치 업로드로 효율적인 저장
- 중복 데이터 방지 및 오류 처리
"""

import json
import glob
import os
import time
from datetime import datetime
from typing import List, Dict, Any

# 설정 파일 import
try:
    from config import get_firebase_path, DEFAULT_COLLECTION_NAME, FIREBASE_SERVICE_ACCOUNT_PATH
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    FIREBASE_SERVICE_ACCOUNT_PATH = None
    DEFAULT_COLLECTION_NAME = "job_posts"

# Firebase 사용을 위한 import (설치 필요: pip install firebase-admin)
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("WARNING firebase-admin 패키지가 설치되지 않았습니다.")
    print("💡 설치 명령어: pip install firebase-admin")

class FirebaseUploader:
    def __init__(self, service_account_path=None):
        self.db = None
        self.service_account_path = service_account_path
        
        if FIREBASE_AVAILABLE and service_account_path:
            self.initialize_firebase()
        
        # 업로드 통계
        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'duplicates': 0,
            'images_uploaded': 0
        }
        
        self.bucket = None
    
    def initialize_firebase(self):
        """Firebase 초기화"""
        try:
            # 기존 앱이 있으면 삭제
            if firebase_admin._apps:
                firebase_admin.delete_app(firebase_admin.get_app())
            
            # 서비스 계정 파일 확인
            if not os.path.exists(self.service_account_path):
                print(f"ERROR 서비스 계정 파일을 찾을 수 없습니다: {self.service_account_path}")
                return False
            
            # Firebase 초기화
            cred = credentials.Certificate(self.service_account_path)
            firebase_admin.initialize_app(cred)
            
            # Firestore 클라이언트 생성
            self.db = firestore.client()
            
            # Storage 버킷 초기화
            from config import FIREBASE_PROJECT_ID
            bucket_name = f"{FIREBASE_PROJECT_ID}.firebasestorage.app"
            self.bucket = storage.bucket(bucket_name)
            
            print(f"OK Firebase 연결 성공 (Storage: {bucket_name})")
            return True
            
        except Exception as e:
            print(f"ERROR Firebase 초기화 실패: {e}")
            self.db = None
            return False
    
    def find_analyzed_files(self):
        """AI 분석된 파일 찾기"""
        print("AI 분석 파일 검색 중...")
        
        files = glob.glob('ai_analyzed_data_*.json')
        
        if files:
            print(f"   발견된 파일: {len(files)}개")
            for f in files:
                file_size = os.path.getsize(f) / 1024  # KB
                print(f"      - {f} ({file_size:.1f}KB)")
        else:
            print("ERROR AI 분석된 데이터 파일을 찾을 수 없습니다.")
            print("💡 먼저 3단계 AI 분석을 완료해주세요.")
            print("   명령어: python ai_analyzer.py")
        
        return files
    
    def load_analyzed_data(self, file_path):
        """분석된 데이터 로드"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"OK 데이터 로드 완료: {len(data)}건")
            return data
            
        except Exception as e:
            print(f"ERROR 데이터 로드 실패: {e}")
            return None

    def upload_images_to_storage(self, image_folder, user_key, collection_name="proApply"):
        """로컬 폴더의 이미지를 Firebase Storage에 업로드"""
        if not self.bucket or not image_folder or image_folder == "없음":
            return []
            
        if not os.path.exists(image_folder):
            # print(f"⚠️ 이미지 폴더를 찾을 수 없음: {image_folder}")
            return []
            
        # 이미지 파일 찾기 (jpg, png, jpeg)
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.webp']
        image_files = []
        for ext in image_extensions:
            image_files.extend(glob.glob(os.path.join(image_folder, ext)))
            
        if not image_files:
            return []
            
        # 최대 5장으로 제한
        image_files = image_files[:5]
        download_urls = []
        
        print(f"📸 이미지 업로드 중... ({len(image_files)}장) - {image_folder}")
        
        for i, local_path in enumerate(image_files):
            try:
                # 저장 경로 설정: {collection_name}/{user_key}/img_{timestamp}_{index}.jpg
                # 카카오톡 캡쳐 예시와 유사하게 파일명 생성
                timestamp_ms = int(time.time() * 1000)
                ext = os.path.splitext(local_path)[1]
                storage_path = f"{collection_name}/{user_key}/img_{timestamp_ms}_{i}{ext}"
                
                blob = self.bucket.blob(storage_path)
                
                # 메타데이터 설정 (이미지 타입)
                content_type = "image/jpeg"
                if ext.lower() == ".png": content_type = "image/png"
                elif ext.lower() == ".webp": content_type = "image/webp"
                
                # 파일 업로드
                blob.upload_from_filename(local_path, content_type=content_type)
                
                # 공식적인 다운로드 URL 생성 (접근 토큰 포함)
                # 이 방식은 Firebase SDK에서 제공하는 방식 또는 토큰을 수동으로 넣은 방식
                # 여기서는 가장 간단한 public URL 형식을 모방하거나 signed URL 사용 가능
                # 하지만 유저가 원한 형식은 SDK가 생성하는 형식이므로, 
                # make_public() 보다는 Firebase Admin SDK의 전형적인 방식을 따름
                blob.make_public()
                download_url = blob.public_url
                
                download_urls.append(download_url)
                self.stats['images_uploaded'] += 1
                
            except Exception as e:
                print(f"⚠️ 이미지 업로드 실패 ({local_path}): {e}")
                
        return download_urls
    
    def validate_data(self, data_list):
        """데이터 유효성 검사"""
        print("데이터 유효성 검사 중...")
        
        valid_data = []
        invalid_count = 0
        
        required_fields = ['originalTitle', 'phoneNumber']
        
        for item in data_list:
            # 필수 필드 확인
            is_valid = True
            for field in required_fields:
                if field not in item or not item[field]:
                    is_valid = False
                    break
            
            # 전화번호 유효성 (빈 문자열이나 '없음'이 아닌 경우만)
            phone_number = item.get('phoneNumber', '')
            if is_valid and (phone_number == '없음' or phone_number == '' or not phone_number.strip()):
                is_valid = False
            
            if is_valid:
                # 날짜 필드 변환 (문자열 -> datetime 객체)
                date_fields = ['createdDate', 'updatedDate', 'pushTime', 'expirationDate']
                
                for field in date_fields:
                    if field in item and isinstance(item[field], str):
                        try:
                            # ISO 형식 문자열을 datetime 객체로 변환
                            item[field] = datetime.fromisoformat(item[field])
                        except ValueError:
                            # 변환 실패 시 현재 시간 사용
                            item[field] = datetime.now()
                    elif field not in item:
                        # 필드가 없으면 현재 시간 사용
                        item[field] = datetime.now()
                
                # 업로드 시간은 서버 시간 사용
                item['uploadedAt'] = firestore.SERVER_TIMESTAMP
                item['status'] = 'active'
                
                # userKey와 username은 이미 ai_analyzer.py에서 설정됨 (덮어쓰지 않음)
                if 'userKey' not in item:
                    item['userKey'] = '8ilymcvPL1V2m5GTbaYV6LLEUAF3'
                if 'username' not in item:
                    item['username'] = '류준열'
                
                # 🔥 중요: geoFirePoint 내부의 geopoint 딕셔너리를 Firestore GeoPoint 객체로 변환
                if 'geoFirePoint' in item and item['geoFirePoint']:
                    gf = item['geoFirePoint']
                    if 'geopoint' in gf and isinstance(gf['geopoint'], dict):
                        lat = gf['geopoint'].get('latitude')
                        lng = gf['geopoint'].get('longitude')
                        if lat is not None and lng is not None:
                            from google.cloud.firestore import GeoPoint
                            gf['geopoint'] = GeoPoint(lat, lng)
                
                # geoFirePoint가 없는 경우에만 새로 생성
                if 'geoFirePoint' not in item or not item.get('geoFirePoint'):
                    from google.cloud.firestore import GeoPoint
                    # deliverAddress가 있으면 지오코딩 시도
                    deliver_address = item.get('deliverAddress') or item.get('address', '')
                    if deliver_address:
                        try:
                            from geocoding import GeocodingService
                            from config import get_kakao_api_key
                            geocoder = GeocodingService(get_kakao_api_key())
                            geofire_point = geocoder.create_geofire_point(deliver_address)
                            if geofire_point:
                                item['geoFirePoint'] = geofire_point
                        except Exception as e:
                            print(f"WARNING 지오코딩 실패, 기본값 사용: {e}")
                    
                # 🚨 최종 GeoPoint 유효성 검사
                # 위에서 변환했거나 새로 생성했는데도 여전히 없거나 유효하지 않으면 제외
                has_geo = False
                if 'geoFirePoint' in item and item['geoFirePoint']:
                    gf = item['geoFirePoint']
                    if 'geohash' in gf and gf['geohash'] and 'geopoint' in gf:
                        # geopoint가 GeoPoint 객체인지 확인 (위에서 변환됨)
                        from google.cloud.firestore import GeoPoint
                        if isinstance(gf['geopoint'], GeoPoint):
                            has_geo = True
                
                if not has_geo:
                    print(f"WARNING 위치 정보 없음 (제외됨): {item.get('originalTitle', '')[:30]}...")
                    is_valid = False
                
                # fcmToken 기본값
                if 'fcmToken' not in item:
                    item['fcmToken'] = ''
                
                # 🖼️ 이미지 업로드 처리
                image_folder = item.get('이미지폴더경로')
                if image_folder and image_folder != '없음':
                    # collection_name은 나중에 main에서 입력받으므로 일단 'proApply' 또는 기본값 사용
                    # main()에서 넘겨준 파라미터가 있으면 좋겠지만 validate_data에는 없음.
                    # 일단 'proApply' 고정 (유저 요청 예시와 동일)
                    user_key = item.get('userKey', '8ilymcvPL1V2m5GTbaYV6LLEUAF3')
                    image_urls = self.upload_images_to_storage(image_folder, user_key)
                    if image_urls:
                        item['imageDownloadUrls'] = image_urls
                        print(f"✅ 이미지 {len(image_urls)}장 업로드 완료")

                if is_valid:
                    valid_data.append(item)
            else:
                invalid_count += 1
        
        print(f"OK 유효한 데이터: {len(valid_data)}건")
        if invalid_count > 0:
            print(f"WARNING 무효한 데이터: {invalid_count}건 (제외됨)")
        
        return valid_data
    
    def check_existing_data(self, collection_name, data_list):
        """기존 데이터와 중복 확인"""
        if not self.db:
            return data_list
        
        print("🔍 중복 데이터 확인 중...")
        
        try:
            # 기존 문서의 ID 목록 가져오기
            existing_docs = self.db.collection(collection_name).stream()
            existing_ids = set()
            
            for doc in existing_docs:
                doc_data = doc.to_dict()
                if 'id' in doc_data:
                    existing_ids.add(doc_data['id'])
            
            # 중복되지 않는 데이터만 필터링
            new_data = []
            duplicate_count = 0
            
            for item in data_list:
                if item['id'] not in existing_ids:
                    new_data.append(item)
                else:
                    duplicate_count += 1
            
            print(f"📊 기존 데이터: {len(existing_ids)}건")
            print(f"🆕 새로운 데이터: {len(new_data)}건")
            if duplicate_count > 0:
                print(f"🔄 중복 데이터: {duplicate_count}건 (건너뜀)")
            
            self.stats['duplicates'] = duplicate_count
            return new_data
            
        except Exception as e:
            print(f"⚠️ 중복 확인 실패: {e}")
            print("💡 모든 데이터를 업로드합니다.")
            return data_list
    
    def upload_batch(self, collection_name, data_batch, batch_num, total_batches):
        """배치 단위로 데이터 업로드"""
        if not self.db:
            return False
        
        try:
            batch = self.db.batch()
            
            for item in data_batch:
                # 문서 ID는 자동 생성
                doc_ref = self.db.collection(collection_name).document()
                batch.set(doc_ref, item)
            
            # 배치 커밋
            batch.commit()
            
            print(f"✅ 배치 {batch_num}/{total_batches} 업로드 완료 ({len(data_batch)}건)")
            return True
            
        except Exception as e:
            print(f"❌ 배치 {batch_num} 업로드 실패: {e}")
            return False
    
    def upload_to_firebase(self, data_list, collection_name='job_posts', batch_size=100):
        """Firebase에 데이터 업로드"""
        if not self.db:
            print("ERROR Firebase 연결이 필요합니다.")
            return False, []
        
        print(f"\nFirebase 업로드 시작...")
        print(f"컬렉션: {collection_name}")
        print(f"업로드할 데이터: {len(data_list)}건")
        print(f"배치 크기: {batch_size}건")
        
        self.stats['total'] = len(data_list)
        
        # 배치 단위로 분할
        batches = [data_list[i:i + batch_size] for i in range(0, len(data_list), batch_size)]
        total_batches = len(batches)
        
        print(f"총 배치 수: {total_batches}개")
        
        # 성공한 데이터 수집
        successful_data = []
        
        # 각 배치 업로드
        for i, batch_data in enumerate(batches, 1):
            try:
                success = self.upload_batch(collection_name, batch_data, i, total_batches)
                
                if success:
                    self.stats['success'] += len(batch_data)
                    successful_data.extend(batch_data)
                else:
                    self.stats['failed'] += len(batch_data)
                
                # 배치 간 대기 (API 제한 고려)
                if i < total_batches:
                    time.sleep(1)
                    
            except KeyboardInterrupt:
                print("\n사용자에 의해 중단되었습니다.")
                break
            except Exception as e:
                print(f"ERROR 배치 {i} 처리 중 오류: {e}")
                self.stats['failed'] += len(batch_data)
                continue
        
        return self.stats['success'] > 0, successful_data
    
    def _make_json_serializable(self, obj):
        """객체를 JSON 직렬화 가능한 형태로 변환"""
        if obj == firestore.SERVER_TIMESTAMP:
            return "SERVER_TIMESTAMP"
        elif hasattr(obj, 'latitude') and hasattr(obj, 'longitude'):
            # GeoPoint 객체
            return {
                'latitude': obj.latitude,
                'longitude': obj.longitude
            }
        elif isinstance(obj, dict):
            return {k: self._make_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._make_json_serializable(item) for item in obj]
        elif hasattr(obj, 'isoformat'):
            # datetime 객체 처리
            return obj.isoformat()
        else:
            return obj
    
    def save_uploaded_data(self, data_list, collection_name):
        """업로드된 데이터를 JSON 파일로 저장"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"firebase_uploaded_{collection_name}_{timestamp}.json"
            
            # JSON 직렬화 가능한 형태로 변환
            serializable_data = [self._make_json_serializable(item) for item in data_list]
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(serializable_data, f, ensure_ascii=False, indent=2)
            
            file_size = os.path.getsize(output_file) / 1024  # KB
            print(f"OK 업로드 결과 파일 저장: {output_file} ({file_size:.1f}KB)")
            return output_file
            
        except Exception as e:
            print(f"WARNING 업로드 결과 파일 저장 실패: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def print_upload_stats(self):
        """업로드 통계 출력"""
        print("\n업로드 통계:")
        print(f"   전체: {self.stats['total']}건")
        print(f"   성공: {self.stats['success']}건")
        print(f"   실패: {self.stats['failed']}건")
        print(f"   중복: {self.stats['duplicates']}건")
        print(f"   이미지 업로드: {self.stats['images_uploaded']}장")
        
        if self.stats['total'] > 0:
            success_rate = (self.stats['success'] / self.stats['total']) * 100
            print(f"   성공률: {success_rate:.1f}%")
    
    def create_sample_service_account(self):
        """샘플 서비스 계정 파일 생성"""
        sample_content = {
            "type": "service_account",
            "project_id": "your-project-id",
            "private_key_id": "your-private-key-id",
            "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
            "client_email": "your-service-account@your-project-id.iam.gserviceaccount.com",
            "client_id": "your-client-id",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
        }
        
        sample_file = "firebase_service_account_sample.json"
        
        try:
            with open(sample_file, 'w', encoding='utf-8') as f:
                json.dump(sample_content, f, indent=2)
            
            print(f"📝 샘플 서비스 계정 파일 생성: {sample_file}")
            print("💡 이 파일을 수정하여 실제 Firebase 서비스 계정 정보를 입력하세요.")
            
        except Exception as e:
            print(f"❌ 샘플 파일 생성 실패: {e}")

def main():
    print("="*60)
    print("4단계 Firebase 저장 단계")
    print("="*60)
    print("작업 내용:")
    print("   - AI 분석된 데이터를 Firebase Firestore에 저장")
    print("   - 배치 업로드로 효율적인 처리")
    print("   - 중복 데이터 방지 및 오류 처리")
    print("="*60)
    
    if not FIREBASE_AVAILABLE:
        print("\n❌ firebase-admin 패키지가 필요합니다.")
        print("💡 설치 명령어: pip install firebase-admin")
        return
    
    uploader = FirebaseUploader()
    
    try:
        # 1. Firebase 서비스 계정 설정
        print("\n🔑 Firebase 서비스 계정 설정")
        service_account_path = None
        
        # 설정 파일에서 Firebase 경로 확인
        if CONFIG_AVAILABLE and FIREBASE_SERVICE_ACCOUNT_PATH:
            if os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
                print(f"✅ 설정 파일에서 서비스 계정 파일 발견: {FIREBASE_SERVICE_ACCOUNT_PATH}")
                use_config = input("이 파일을 사용하시겠습니까? (y/n): ").lower().strip()
                if use_config == 'y':
                    service_account_path = FIREBASE_SERVICE_ACCOUNT_PATH
                    print("✅ 설정된 서비스 계정 파일을 사용합니다.")
        
        # 설정 파일에서 찾지 못했거나 사용자가 거부한 경우
        if not service_account_path:
            service_account_files = glob.glob("*service*account*.json") + glob.glob("firebase*.json") + glob.glob("yongcar*.json")
            
            if service_account_files:
                print("📁 발견된 서비스 계정 파일:")
                for i, f in enumerate(service_account_files, 1):
                    print(f"   {i}. {f}")
                
                choice = input(f"파일 번호 선택 (1-{len(service_account_files)}) 또는 직접 입력 (d): ").strip()
                
                if choice == 'd':
                    service_account_path = input("서비스 계정 파일 경로 입력: ").strip()
                else:
                    try:
                        idx = int(choice) - 1
                        service_account_path = service_account_files[idx]
                    except:
                        print("❌ 잘못된 선택입니다.")
                        return
            else:
                print("📁 서비스 계정 파일을 찾을 수 없습니다.")
                service_account_path = input("서비스 계정 파일 경로 입력 (또는 's'로 샘플 생성): ").strip()
                
                if service_account_path == 's':
                    uploader.create_sample_service_account()
                    print("💡 샘플 파일을 수정한 후 다시 실행해주세요.")
                    return
        
        # Firebase 초기화
        uploader.service_account_path = service_account_path
        if not uploader.initialize_firebase():
            return
        
        # 2. 분석된 파일 찾기
        files = uploader.find_analyzed_files()
        if not files:
            return
        
        # 가장 최신 파일 선택
        latest_file = max(files, key=lambda x: os.path.getmtime(x))
        print(f"\n📁 업로드 대상 파일: {latest_file}")
        
        # 3. 데이터 로드
        data_list = uploader.load_analyzed_data(latest_file)
        if not data_list:
            return
        
        # 4. 데이터 유효성 검사
        valid_data = uploader.validate_data(data_list)
        if not valid_data:
            print("❌ 유효한 데이터가 없습니다.")
            return
        
        # 5. 컬렉션 이름 설정
        print(f"\n📂 Firebase 컬렉션 설정")
        collection_name = input(f"컬렉션 이름 (기본값: {DEFAULT_COLLECTION_NAME}): ").strip()
        
        if not collection_name:
            collection_name = DEFAULT_COLLECTION_NAME
        
        print(f"✅ 컬렉션: {collection_name}")
        
        # 6. 중복 데이터 확인
        new_data = uploader.check_existing_data(collection_name, valid_data)
        
        if not new_data:
            print("❌ 업로드할 새로운 데이터가 없습니다.")
            return
        
        # 7. 사용자 확인
        print(f"\n🚀 Firebase에 {len(new_data)}건을 업로드하시겠습니까?")
        print(f"📂 컬렉션: {collection_name}")
        confirm = input("계속하려면 'y', 취소하려면 'n': ").lower().strip()
        
        if confirm != 'y':
            print("❌ 작업이 취소되었습니다.")
            return
        
        # 8. Firebase 업로드
        success, uploaded_data = uploader.upload_to_firebase(new_data, collection_name)
        
        # 9. 결과 출력
        uploader.print_upload_stats()
        
        if success:
            # 10. 업로드된 데이터를 파일로 저장 (성공한 데이터만)
            uploaded_file = uploader.save_uploaded_data(uploaded_data, collection_name)
            
            print("\n" + "="*60)
            print("OK 4단계 Firebase 저장 완료!")
            print("="*60)
            print(f"컬렉션: {collection_name}")
            print(f"업로드된 데이터: {uploader.stats['success']}건")
            if uploaded_file:
                print(f"결과 파일: {uploaded_file}")
            print("="*60)
            
            print("\n전체 파이프라인 완료!")
            print("Firebase Console에서 데이터를 확인하세요.")
        else:
            print("\n업로드에 실패했습니다.")
        
    except KeyboardInterrupt:
        print("\n🛑 사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        print("💡 오류 내용을 확인하고 다시 시도해주세요.")

if __name__ == "__main__":
    main()
