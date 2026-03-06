import 'package:cloud_firestore/cloud_firestore.dart';

class ProApplyModel {
  final String? id;
  final List<String> subCategories; // 소문자로 통일 권장
  final String? topCategories;
  final String? address;
  final int badge;
  final DateTime? expirationDate;
  final List<dynamic> favorites;
  final List<String>? imageDownloadUrls;
  final bool isNotice;
  final bool notice;
  final DateTime? pushTime;
  final String? region;
  final String? subRegion;
  final DateTime updatedDate;
  final String? username;
  final String? license;           // 화물운송자격증
  final String? category;          // 택배사 (cj 등)
  final String? collectionCargo;   // 집하
  final String? company;           // 대리점명
  final bool confirmed;         // 접수 상태
  final DateTime? createdDate;     // 생성일
  final String? deliverAddress;    // 배송지 주소
  final String? detail;            // 상세 설명
  final String? dropOff;           // 분류도우미
  final String? fcmToken;          // FCM 토큰
  final Map<String, dynamic> geoFirePoint;
  final String geohash;
  final GeoPoint geopoint;
  final List<dynamic> numOfLikes;  // 좋아요 수/목록
  final String? phoneNumber;       // 전화번호
  final String? pushKey;           // 푸시 키
  final String? ratio;             // 배송지 비율
  final DateTime? startDate;       // 시작일
  final String? terminalAddress;   // 터미널 주소
  final String? userKey;           // 작성자 키
  final String? workTime;          // 근무 시간
  final String? holiday;           // 휴일
  final String? totalVolume;       // 총 배송물량
  final String? monthlyIncome;     // 월 수익
  final Map<String, dynamic> deadline;
  final List<String> selectedJobNames; // 선택된 직무명들 (하위업종 - 직무분야)

  DocumentReference? reference;

  ProApplyModel({
    this.id,
    required this.subCategories,
    this.topCategories,
    this.address,
    this.badge = 0,
    this.expirationDate,
    required this.favorites,
    this.imageDownloadUrls,
    this.isNotice = false,
    this.notice = true,
    this.pushTime,
    this.region,
    this.subRegion,
    required this.updatedDate,
    this.username,
    this.license,
    this.category,
    this.collectionCargo,
    this.company,
    required this.confirmed,
    this.createdDate,
    this.deliverAddress,
    this.detail,
    this.dropOff,

    this.fcmToken,
    required this.geoFirePoint,
    required this.geohash,
    required this.geopoint,

    required this.numOfLikes,
    this.phoneNumber,
    this.pushKey,
    this.ratio,
    this.startDate,
    this.terminalAddress,
    this.userKey,
    this.workTime,
    this.holiday,
    this.totalVolume,
    this.monthlyIncome,
    this.reference,
    this.deadline = const {
      'type': '마감일 지정',
      'startDate': '',
      'startTime': '12시',
      'endDate': '',
      'endTime': '24시'
    },
    this.selectedJobNames = const [],
  });

  // JSON 데이터로부터 모델 생성
  ProApplyModel.fromJson(Map<String, dynamic> json, String id, this.reference)
      : this.id = id,
        subCategories = List<String>.from(json['SubCategories'] ?? []),
        topCategories = json['TopCategories'],
        address = json['address'] ?? json['deliverAddress'],
        badge = json['badge'] ?? 0,
        expirationDate = (json["expirationDate"] as Timestamp?)?.toDate(),
        favorites = json["favorites"] ?? [],
        imageDownloadUrls = List<String>.from(json['imageDownloadUrls'] ?? []),
        isNotice = json["isNotice"] ?? false,
        notice = json['notice'] ?? true,
        pushTime = (json["pushTime"] as Timestamp?)?.toDate(),
        region = json['region'],
        subRegion = json['subRegion'],
        updatedDate = (json["updatedDate"] as Timestamp?)?.toDate() ?? DateTime.now(),
        username = json['username'],
        license = json['License'],
        category = json['category'],
        collectionCargo = json['collectionCargo'],
        company = json['company'],
        confirmed = json["confirmed"] ?? false,
        createdDate = (json["createdDate"] as Timestamp?)?.toDate(),
        deliverAddress = json['deliverAddress'],
        detail = json['detail'],
        dropOff = json['dropOff'],

        fcmToken = json['fcmToken'] ?? "",
        geoFirePoint = json["geoFirePoint"] ?? {},
        geohash = (json["geoFirePoint"] as Map<String, dynamic>?)?["geohash"] as String? ?? "",
        geopoint = json["geoFirePoint"] is Map<String, dynamic>
            ? (json["geoFirePoint"] as Map<String, dynamic>)["geopoint"] as GeoPoint? ?? const GeoPoint(0, 0)
            : const GeoPoint(0, 0),

        numOfLikes = json["numOfLikes"] ?? [],
        phoneNumber = json['phoneNumber'],
        pushKey = json['pushKey'],
        deadline = Map<String, dynamic>.from(json["deadline"] ?? {
          'type': '마감일 지정',
          'startDate': '',
          'startTime': '12시',
          'endDate': '',
          'endTime': '24시'
        }),
        ratio = json['ratio'],

        startDate = (json["startDate"] as Timestamp?)?.toDate(),
        terminalAddress = json['terminalAddress'],
        userKey = json['userKey'],
        workTime = json['workTime'],
        holiday = json['holiday'],
        totalVolume = json['totalVolume'],
        monthlyIncome = json['monthlyIncome'],
        selectedJobNames = List<String>.from(json["selectedJobNames"] ?? []);

  // Snapshot으로부터 모델 생성
  ProApplyModel.fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snapshot)
      : this.fromJson(snapshot.data()!, snapshot.id, snapshot.reference);

  // QuerySnapshot으로부터 모델 생성
  factory ProApplyModel.fromQuerySnapshot(QueryDocumentSnapshot<Map<String, dynamic>> snapshot) {
    return ProApplyModel.fromJson(snapshot.data(), snapshot.id, snapshot.reference);
  }

  // 모델을 다시 Map으로 변환 (Firestore 저장용)
  Map<String, dynamic> toJson() {
    return {
      'SubCategories': subCategories,
      'TopCategories': topCategories,
      'address': address,
      'badge': badge,
      'expirationDate': expirationDate,
      'favorites': favorites,
      'imageDownloadUrls': imageDownloadUrls,
      'isNotice': isNotice,
      'notice': notice,
      'pushTime': pushTime,
      'region': region,
      'subRegion': subRegion,
      'updatedDate': updatedDate,
      'username': username,
      'License': license,
      'category': category,
      'collectionCargo': collectionCargo,
      'company': company,
      'confirmed': confirmed,
      'createdDate': createdDate,
      'deliverAddress': deliverAddress,
      'detail': detail,
      'dropOff': dropOff,

      'fcmToken': fcmToken,
      'geoFirePoint': geoFirePoint,

      'numOfLikes': numOfLikes,
      'phoneNumber': phoneNumber,
      'pushKey': pushKey,
      'ratio': ratio,
      'startDate': startDate,
      'terminalAddress': terminalAddress,
      'selectedJobNames': selectedJobNames,
      'userKey': userKey,
      'workTime': workTime,
      'holiday': holiday,
      'totalVolume': totalVolume,
      'monthlyIncome': monthlyIncome,
      'deadline': deadline
    };
  }
}