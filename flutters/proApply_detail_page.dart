import 'package:yongcar/proApply/proApply_edit_page.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import '../data/user_model.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import '../pages/quotation.dart';
import '../providers/user_notifier.dart';
import 'package:provider/provider.dart';
import '../widgets/full_screen_image_dialog.dart';

import 'proApply_model.dart';
import '../pages/apply_job_dialog.dart';


class ProApplyDetailPage extends StatefulWidget {
  final String proApplyId;

  const ProApplyDetailPage({Key? key, required this.proApplyId}) : super(key: key);

  @override
  _ProApplyDetailPageState createState() => _ProApplyDetailPageState();
}

class _ProApplyDetailPageState extends State<ProApplyDetailPage> {
  late Stream<ProApplyModel?> _itemFuture;
  final PageController _pageController = PageController();
  final ScrollController _scrollController = ScrollController();
  bool isAppbarCollapsed = false;
  Size? _size;
  double? _statusBarHeight;
  final currentUser = FirebaseAuth.instance.currentUser;

  @override
  void initState() {
    super.initState();
    _itemFuture = _fetchProApplyDetails();
    _scrollController.addListener(() {
      if (_size == null || _statusBarHeight == null) return;
      final double collapseHeight = _size!.width - kToolbarHeight - _statusBarHeight!;
      if (isAppbarCollapsed) {
        if (_scrollController.offset < collapseHeight) {
          setState(() {
            isAppbarCollapsed = false;
          });
        }
      } else {
        if (_scrollController.offset > collapseHeight) {
          setState(() {
            isAppbarCollapsed = true;
          });
        }
      }
    });
  }

  Stream<ProApplyModel?> _fetchProApplyDetails()  {
    return FirebaseFirestore.instance
        .collection('proApply')
        .doc(widget.proApplyId)
        .snapshots()
        .map((docSnapshot) {
      if (docSnapshot.exists && docSnapshot.data() != null) {
        return ProApplyModel.fromSnapshot(docSnapshot);
      }
      return null;
    });
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black87,
                    fontWeight: FontWeight.w600,
                  ),
                  softWrap: true,
                  overflow: TextOverflow.visible,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }



  String _formatSalary(ProApplyModel job) {
    if (job.monthlyIncome != null && job.monthlyIncome!.isNotEmpty) {
      return '월 수익: ${job.monthlyIncome}';
    }

    if (job.totalVolume != null && job.totalVolume!.isNotEmpty) {
      return '총 물량: ${job.totalVolume}';
    }

    if (job.ratio != null && job.ratio!.isNotEmpty) {
      return '배송비: ${job.ratio}';
    }

    return '급여 협의';
  }

  String _formatWorkHours(ProApplyModel job) {
    if (job.workTime != null && job.workTime!.isNotEmpty) {
      return job.workTime!;
    }

    if (job.holiday != null && job.holiday!.isNotEmpty) {
      return '휴일: ${job.holiday}';
    }

    return '근무시간 협의';
  }

  String _formatDeadline(ProApplyModel job) {
    String? endDateStr = job.deadline['endDate'];

    if (endDateStr != null && endDateStr.isNotEmpty) {
      // 2. 문자열을 DateTime 객체로 변환
      DateTime dt = DateTime.parse(endDateStr);

      // 3. 원하는 형식으로 리턴
      return '마감: ${dt.year}년 ${dt.month}월 ${dt.day}일';
    } else {
      return '채용시까지';
    }
  }

  Future<void> deleteMainPost(BuildContext context, ProApplyModel item) async {
    if (currentUser?.uid != context.read<UserNotifier>().userModel?.userKey) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("게시물을 삭제할 권한이 없습니다.")),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("게시물 삭제"),
        content: const Text("게시물과 모든 데이터를 삭제하시겠습니까?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("취소"),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("삭제"),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        // 이미지 삭제
        if (item.imageDownloadUrls != null && item.imageDownloadUrls!.isNotEmpty) {
          for (String imageUrl in item.imageDownloadUrls!) {
            try {
              final ref = FirebaseStorage.instance.refFromURL(imageUrl);
              await ref.delete();
            } catch (e) {
              print('이미지 삭제 중 오류: $e');
            }
          }
        }

        // Firestore 문서 삭제
        await FirebaseFirestore.instance
            .collection('proApply')
            .doc(widget.proApplyId)
            .delete();

        // 사용자의 myList에서 항목 제거
        if (currentUser != null) {
          final userDocRef = FirebaseFirestore.instance
              .collection('users')
              .doc(currentUser!.uid);

          await userDocRef.update({
            'myList': FieldValue.arrayRemove([
              {
                'category': 'professionals',
                'top': 'proApply',
                'middle': 'registration',
                'id': widget.proApplyId,
              }
            ])
          });
        }

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("게시물이 삭제되었습니다.")),
        );

        Navigator.of(context).pop();
      } catch (error) {
        print("Error deleting post: $error");
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("게시물 삭제에 실패했습니다.")),
        );
      }
    }
  }

  // 문자 보내기 함수
  void sendSMS(String phoneNumber, String message) async {
    final Uri smsLaunchUri = Uri(
      scheme: 'sms',
      path: phoneNumber,
      queryParameters: <String, String>{
        'body': message,
      },
    );
    
    try {
      if (await canLaunchUrl(smsLaunchUri)) {
        await launchUrl(smsLaunchUri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('문자 앱을 열 수 없습니다.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('문자 전송에 실패했습니다.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    UserModel? userModel = context.read<UserNotifier>().userModel;
    _size = MediaQuery.of(context).size;
    _statusBarHeight = MediaQuery.of(context).padding.top;

    return StreamBuilder<ProApplyModel?>(
      stream: _itemFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
              body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasError) {
          return const Scaffold(
              body: Center(child: Text('데이터를 불러오는 중 오류가 발생했습니다.')));
        }
        if (!snapshot.hasData || snapshot.data == null) {
          return const Scaffold(
              body: Center(child: Text('구인 정보가 존재하지 않습니다.')));
        }

        final item = snapshot.data!;
        final imageList = item.imageDownloadUrls ?? [];
        final hasImages = imageList.isNotEmpty;
        final isAuthor = (item.userKey == userModel?.userKey);
        final isAuthor2 = (userModel?.expirationDate == null || userModel?.expirationDate == "" || userModel!.expirationDate!.isBefore(DateTime.now()));

        return Scaffold(
          body: CustomScrollView(
            controller: _scrollController,
            slivers: [
              _imagesAppBar(hasImages, imageList, item.company ?? item.username ?? '구인 신청'),
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  // 확정 상태 표시 (confirmed 필드 사용)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: item.confirmed ? Colors.green[50] : Colors.orange[50],
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: item.confirmed ? Colors.green[300]! : Colors.orange[300]!,
                                        width: 1,
                                      ),
                                    ),
                                    child: Text(
                                      item.confirmed ? "확정" : "대기",
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: item.confirmed ? Colors.green[700] : Colors.orange[700],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      item.company ??  item.username ?? '제목 없음',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.black87,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            isAuthor ?
                            Container(
                              decoration: BoxDecoration(
                                color: item.confirmed ? Colors.green[50] : Colors.orange[50],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: item.confirmed ? Colors.green[300]! : Colors.orange[300]!,
                                  width: 1,
                                ),
                              ),
                              child: TextButton(
                                style: TextButton.styleFrom(
                                  minimumSize: const Size(70, 36),
                                  backgroundColor: Colors.transparent,
                                  foregroundColor: item.confirmed ? Colors.green[700] : Colors.orange[700],
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                onPressed: () {
                                  FirebaseFirestore.instance
                                      .collection('proApply')
                                      .doc(widget.proApplyId)
                                      .update({'confirmed': !item.confirmed});
                                },
                                child: Text(
                                  item.confirmed ? "대기로 변경" : "확정하기",
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            )
                                : SizedBox(),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // 대리점명/회사명
                        if (item.company != null && item.company!.isNotEmpty) ...[
                          _buildInfoRow('대리점명', item.company!, Icons.account_balance_sharp),
                          const SizedBox(height: 12),
                        ],

                        // 택배사
                        if (item.category != null && item.category!.isNotEmpty) ...[
                          _buildInfoRow('택배사', item.category!, Icons.business_outlined),
                          const SizedBox(height: 12),
                        ],

                        // 모집 직종
                        if (item.collectionCargo != null && item.collectionCargo!.isNotEmpty) ...[
                          _buildInfoRow('모집 직종', item.collectionCargo!, Icons.work_outline),
                          const SizedBox(height: 12),
                        ],

                        // 화물운송자격증
                        if (item.license != null && item.license!.isNotEmpty) ...[
                          _buildInfoRow('화물운송자격증', item.license!, Icons.verified_outlined),
                          const SizedBox(height: 12),
                        ],

                        // 근무시간
                        _buildInfoRow('근무시간', _formatWorkHours(item), Icons.schedule_outlined),
                        const SizedBox(height: 12),

                        // 급여/수익 정보
                        _buildInfoRow('급여/수익', _formatSalary(item), Icons.payments_outlined),
                        const SizedBox(height: 12),

                        // 상하차/분류 정보
                        if (item.dropOff != null && item.dropOff!.isNotEmpty) ...[
                          _buildInfoRow('분류도우미', item.dropOff!, Icons.local_shipping_outlined),
                          const SizedBox(height: 12),
                        ],

                        // 배송지 비율
                        if (item.ratio != null && item.ratio!.isNotEmpty) ...[
                          _buildInfoRow('배송지 비율', item.ratio!, Icons.pie_chart_outline),
                          const SizedBox(height: 12),
                        ],

                        // 모집마감
                        _buildInfoRow('모집마감', _formatDeadline(item), Icons.event_outlined),
                        const SizedBox(height: 12),

                        // 근무지 (배송지 주소)
                        if (item.deliverAddress != null && item.deliverAddress!.isNotEmpty) ...[
                          _buildInfoRow('배송지', item.deliverAddress!, Icons.location_on_outlined),
                          const SizedBox(height: 12),
                        ],

                        // 터미널 주소
                        if (item.terminalAddress != null && item.terminalAddress!.isNotEmpty) ...[
                          _buildInfoRow('터미널 주소', item.terminalAddress!, Icons.warehouse_outlined),
                          const SizedBox(height: 12),
                        ],

                        // 시작일
                        if (item.startDate != null) ...[
                          _buildInfoRow('시작일', '${item.startDate!.year}년 ${item.startDate!.month}월 ${item.startDate!.day}일', Icons.today_outlined),
                          const SizedBox(height: 12),
                        ],

                        // 전화번호
                        if (item.phoneNumber != null && item.phoneNumber!.isNotEmpty) ...[
                          _buildInfoRow('연락처', item.phoneNumber!, Icons.phone_outlined),
                          const SizedBox(height: 12),
                        ],

                        // 상세 설명
                        if (item.detail != null && item.detail!.isNotEmpty) ...[
                          _buildInfoRow('상세설명', item.detail!, Icons.description_outlined),
                          const SizedBox(height: 12),
                        ],

                        if (isAuthor) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.settings_outlined, size: 18, color: Colors.grey[600]),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '게시물 관리',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              onPressed: () {
                                                Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (context) => ProApplyEditPage(
                                                      proApplyId: widget.proApplyId,
                                                      proApply: item,
                                                    ),
                                                  ),
                                                );
                                              },
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: Colors.blue[50],
                                                foregroundColor: Colors.blue[700],
                                                elevation: 0,
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                              ),
                                              icon: Icon(Icons.edit_outlined, size: 14),
                                              label: const Text(
                                                '수정',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              onPressed: () => deleteMainPost(context, item),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: Colors.red[50],
                                                foregroundColor: Colors.red[700],
                                                elevation: 0,
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                              ),
                                              icon: Icon(Icons.delete_outline, size: 14),
                                              label: const Text(
                                                '삭제',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            // 지원하기 버튼
                            Expanded(
                              flex: 2,
                              child: Container(
                                height: 48,
                                child: ElevatedButton(
                                  onPressed: isAuthor ? null : () {
                                    // 지원자인 경우 지원하기 다이얼로그만 표시
                                    showDialog(
                                      context: context,
                                      builder: (context) => ApplyJobDialog(
                                        proApplyId: widget.proApplyId,
                                      ),
                                    );
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isAuthor ? Colors.grey : const Color(0xFF4F46E5),
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    elevation: 2,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(isAuthor ? Icons.admin_panel_settings : Icons.send_outlined, size: 18),
                                      const SizedBox(width: 8),
                                      Text(
                                        isAuthor ? '작성자 (지원불가)' : '지원하기',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            // 문자보내기 버튼
                            Expanded(
                              flex: 1,
                              child: Container(
                                height: 48,
                                child: ElevatedButton(
                                  onPressed: isAuthor || (item.phoneNumber == null || item.phoneNumber!.isEmpty) 
                                    ? null 
                                    : () {
                                        String message = '안녕하세요. 구인공고에 관심이 있어 연락드립니다. [용카] 앱';
                                        sendSMS(item.phoneNumber!, message);
                                      },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isAuthor || (item.phoneNumber == null || item.phoneNumber!.isEmpty)
                                      ? Colors.grey 
                                      : Colors.green[600],
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    elevation: 2,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.message_outlined, size: 16),
                                      const SizedBox(width: 4),
                                      Text(
                                        '문자',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 80), // 하단 여백 추가
                      ]),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }

  SliverAppBar _imagesAppBar(bool hasImages, List<String> imageList, String? title) {
    return SliverAppBar(
      title: hasImages
          ? const Text('')
          : Text(
        title ?? '구인 신청',
        style: const TextStyle(color: Colors.black87),
      ),
      centerTitle: true,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.grey[50],
      foregroundColor: hasImages ? Colors.white : Colors.black87,
      iconTheme: IconThemeData(color: hasImages ? Colors.white : Colors.black87),
      expandedHeight: hasImages ? _size!.width : 0,
      pinned: true,
      floating: false,
      snap: false,
      flexibleSpace: FlexibleSpaceBar(
        titlePadding: EdgeInsets.zero,
        background: hasImages
            ? Stack(
                alignment: Alignment.bottomCenter,
                children: [
                  PageView.builder(
                    controller: _pageController,
                    itemCount: imageList.length,
                    itemBuilder: (context, index) {
                      return GestureDetector(
                        onTap: () => _showFullScreenImage(context, imageList, index),
                        child: Image.network(
                          imageList[index],
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              const Center(
                                child: Icon(Icons.broken_image, size: 50, color: Colors.grey),
                              ),
                        ),
                      );
                    },
                  ),
                  // 상단에 그라데이션 오버레이 추가 (뒤로가기 버튼 가시성 향상)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 100,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(0.3),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (imageList.length > 1)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: SmoothPageIndicator(
                        controller: _pageController,
                        count: imageList.length,
                        effect: const ScrollingDotsEffect(
                          dotColor: Colors.grey,
                          activeDotColor: Colors.white,
                          dotHeight: 8,
                          dotWidth: 8,
                        ),
                      ),
                    ),
                ],
              )
            : Container(),
      ),
    );
  }

  // 전체화면 이미지 다이얼로그
  void _showFullScreenImage(BuildContext context, List<String> imageList, int initialIndex) {
    showDialog(
      context: context,
      barrierColor: Colors.black,
      builder: (BuildContext context) {
        return FullScreenImageDialog(
          imageList: imageList,
          initialIndex: initialIndex,
        );
      },
    );
  }
}