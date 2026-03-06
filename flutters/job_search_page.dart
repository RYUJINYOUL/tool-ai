import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:yongcar/pages/register_job_page.dart';
import 'package:yongcar/pages/upload_page.dart';
import '../constants/industry_data.dart';
import '../constants/region_data.dart';
import '../proApply/proApply_model.dart';
import '../proApply/proApply_detail_page.dart';
import '../professionals/professionals_model.dart';
import '../professionals/professionals_detail_page.dart';
import '../providers/user_notifier.dart';
import '../utils/communication_utils.dart';
import '../utils/common_job_search_page.dart';
import 'apply_page.dart';


class JobSearchPage extends StatefulWidget {
  final List<String>? initialCategories;

  const JobSearchPage({
    Key? key,
    this.initialCategories,
  }) : super(key: key);

  @override
  State<JobSearchPage> createState() => _JobSearchPageState();
}

class _JobSearchPageState extends State<JobSearchPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<String> _sharedCategories = ['전체'];


  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    _tabController.addListener(_handleTabSelection);

    // 초기 카테고리가 전달되면 설정
    if (widget.initialCategories != null && widget.initialCategories!.isNotEmpty) {
      _sharedCategories = widget.initialCategories!;
    }
  }

  void _handleTabSelection() {
    if (!_tabController.indexIsChanging) {
      setState(() {
        // 탭 인덱스가 바뀌었으므로 화면(FAB 포함)을 다시 그리도록 함
      });
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabSelection);
    _tabController.dispose();
    super.dispose();
  }

  // 카테고리 변경 콜백
  void _onCategoryChanged(List<String> newCategories) {
    setState(() {
      _sharedCategories = newCategories;
    });
  }

  Widget _buildCompactTab(int index, IconData icon, String label) {
    return Expanded(
      child: GestureDetector(
        onTap: () => _tabController.animateTo(index),
        child: AnimatedBuilder(
          animation: _tabController,
          builder: (context, child) {
            final isSelected = _tabController.index == index;
            return Container(
              padding: const EdgeInsets.symmetric(vertical: 8), // 12 -> 8로 축소
              decoration: BoxDecoration(
                color: isSelected ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                boxShadow: isSelected ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4, // 그림자도 더 가볍게
                    offset: const Offset(0, 1),
                  ),
                ] : null,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 18, // 20 -> 18로 축소
                      color: isSelected ? Colors.grey[800] : Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 14, // 15 -> 14로 축소
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      color: isSelected ? Colors.grey[800] : Colors.grey[500],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Column(
          children: [
            // 탭 버튼
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), // 상하 마진 축소
              padding: const EdgeInsets.all(4), // 내부 배경과 탭 사이의 간격 고정
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(10), // 약간 더 각지게 (슬림해 보임)
              ),
              child: Row(
                children: [
                  _buildCompactTab(0, Icons.work_outline, '구인'),
                  const SizedBox(width: 4),
                  _buildCompactTab(1, Icons.person_search, '인재'),
                ],
              ),
            ),

            // TabBarView
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  JobSearchTab(
                    sharedCategories: _sharedCategories,
                    onCategoryChanged: _onCategoryChanged,
                  ),
                  TalentSearchTab(
                    // sharedCategories: _sharedCategories,
                    // onCategoryChanged: _onCategoryChanged,
                  ),
                ],
              ),
            ),
          ],
        ),

        // FAB를 Stack 최상위에 배치
        Positioned(
          left: 0,
          right: 0, // 왼쪽과 오른쪽 끝을 모두 0으로 잡으면 가로 전체 영역을 차지합니다.
          bottom: 10,
          child: Center( // 그 중앙에 버튼을 배치합니다.
            child: _buildFloatingActionButton(),
          ),
        ),
      ],
    );
  }

  /// Floating Action Button 빌더
  Widget _buildFloatingActionButton() {
    return FloatingActionButton.extended(
      extendedPadding: EdgeInsets.all(5.0),
      onPressed: _handleFabPress,
      backgroundColor: const Color(0xFF4CAF50),
      // 라벨(텍스트) 설정
      label: Text(
        (_tabController.index == 0) ? '구인등록' : '인재등록',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 13, // 폰트 크기를 적절히 조절
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  /// FAB 클릭 핸들러
  void _handleFabPress() {
    final userNotifier = context.read<UserNotifier>();
    final userModel = userNotifier.userModel;

    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    // 로그인 체크
    if (userModel == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('로그인이 필요합니다.'),
          backgroundColor: Colors.red,
        ),
      );
      Navigator.pushNamed(context, '/login');
      return;
    }

    if (_tabController.index == 0) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ApplyPage(initialCategory: '구인'),
        ),
      );
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const RegisterJobPage(),
        ),
      );
    }
  }
}

/// 구인 탭
class JobSearchTab extends StatefulWidget {
  final List<String> sharedCategories;
  final Function(List<String>) onCategoryChanged;

  const JobSearchTab({
    Key? key,
    required this.sharedCategories,
    required this.onCategoryChanged,
  }) : super(key: key);

  @override
  State<JobSearchTab> createState() => _JobSearchTabState();
}

class _JobSearchTabState extends State<JobSearchTab> {
  void _refreshJobList() {
    // 페이지를 다시 빌드하여 새로고침 효과
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return CommonJobSearchPage<ProApplyModel>(
      collectionName: 'proApply',
      categoryList: deliveryList,
      title: '구직',
      primaryColor: const Color(0xFF4F46E5),
      selectedColor: const Color(0xFF4CAF50),
      modelFromJson: ProApplyModel.fromJson,
      modelFromQuerySnapshot: ProApplyModel.fromQuerySnapshot,
      buildCard: (context, job, distance, isAd, onToggleWishlist) => _buildJobCard(context, job, isAd, distance, onToggleWishlist, _refreshJobList),
      getNameFromModel: (model) => model.username ?? '',
      getDescriptionFromModel: (model) => model.detail ?? '',
      getPhoneFromModel: (model) => model.phoneNumber ?? '',
      getSubCategoriesFromModel: (model) => model.subCategories,
      getGeoFirePointFromModel: (model) => model.geoFirePoint,
      getIdFromModel: (model) => model.id ?? '',
      getImageUrlsFromModel: (model) => model.imageDownloadUrls,
      getReferenceFromModel: (model) => model.reference,
      wishlistCategory: 'proApply',
      detailPageBuilder: (id) => ProApplyDetailPage(proApplyId: id),
      initialCategories: widget.sharedCategories,
      onCategoryChanged: widget.onCategoryChanged,
      // Note: selectedJobNames is not available in new model, using category instead
      getSelectedJobNamesFromModel: (model) => model.category != null ? [model.category!] : [],
    );
  }

  static Widget _buildJobCard(
      BuildContext context,
      ProApplyModel job,
      bool isAd,
      double? distance,
      VoidCallback onToggleWishlist,
      VoidCallback onRefresh,
      ) {
    final hasImage = job.imageDownloadUrls != null && job.imageDownloadUrls!.isNotEmpty;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProApplyDetailPage(proApplyId: job.id!),
          ),
        );
      },
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              spreadRadius: 0,
              blurRadius: 8,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (hasImage)
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Container(
                  width: 90,
                  height: 90,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      bottomLeft: Radius.circular(12),
                    ),
                    child: Image.network(
                      job.imageDownloadUrls!.first,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  job.company ?? job.username ?? '제목 없음',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                    color: Colors.black87,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (job.subCategories.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Wrap(
                                  spacing: 4,
                                  runSpacing: 4,
                                  children: job.subCategories.take(2).map((subCategory) {
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.purple[50],
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        subCategory,
                                        style: TextStyle(
                                          color: Colors.purple[700],
                                          fontSize: 10,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Consumer<UserNotifier>(
                          builder: (context, userNotifier, child) {
                            final currentUser = userNotifier.userModel;
                            final isOwner = currentUser?.userKey == job.userKey;
                            final isAdmin = currentUser?.userKey == 'cYjFpXKkvhe4vt4FU26XtMHwm1j2';
                            final canEdit = isOwner || isAdmin;

                            return Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (canEdit)
                                  PopupMenuButton<String>(
                                    onSelected: (value) {
                                      if (value == 'edit') {
                                        _editJobPost(context, job);
                                      } else if (value == 'delete') {
                                        _deleteJobPost(context, job, onRefresh);
                                      }
                                    },
                                    itemBuilder: (context) => [
                                      const PopupMenuItem(
                                        value: 'edit',
                                        child: Row(
                                          children: [
                                            Icon(Icons.edit, size: 16),
                                            SizedBox(width: 8),
                                            Text('수정'),
                                          ],
                                        ),
                                      ),
                                      const PopupMenuItem(
                                        value: 'delete',
                                        child: Row(
                                          children: [
                                            Icon(Icons.delete, size: 16, color: Colors.red),
                                            SizedBox(width: 8),
                                            Text('삭제', style: TextStyle(color: Colors.red)),
                                          ],
                                        ),
                                      ),
                                    ],
                                    child: Icon(
                                      Icons.more_vert,
                                      color: Colors.grey[600],
                                      size: 20,
                                    ),
                                  ),
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: onToggleWishlist,
                                  child: Icon(
                                    _isInWishlist(job, userNotifier.userModel) ? Icons.favorite : Icons.favorite_border,
                                    color: _isInWishlist(job, userNotifier.userModel) ? Colors.red : Colors.grey[400],
                                    size: 20,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Wrap(
                              spacing: 5,
                              runSpacing: 4,
                              children: [
                                if (job.category != null && job.category!.isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.blue[50],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      job.category!,
                                      style: TextStyle(
                                        color: Colors.blue[700],
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                if (job.monthlyIncome != null && job.monthlyIncome!.isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.blue[50],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '수익: ${job.monthlyIncome!}',
                                      style: TextStyle(
                                        color: Colors.blue[700],
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                if (job.totalVolume != null && job.totalVolume!.isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.green[50],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '수량: ${job.totalVolume}',
                                      style: TextStyle(
                                        color: Colors.green[700],
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                // 이미지가 없을 때만 자격증 표시
                                if (job.license != null &&
                                    job.license!.isNotEmpty &&
                                    (job.imageDownloadUrls == null || job.imageDownloadUrls!.isEmpty))  // 이 조건 추가
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.orange[50],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '자격증: ${job.license!}',
                                      style: TextStyle(
                                        color: Colors.orange[700],
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (distance != null)
                            Row(
                              children: [
                                Icon(Icons.location_on, size: 12, color: Colors.grey[500]),
                                const SizedBox(width: 2),
                                Text(
                                  '${distance.toStringAsFixed(1)}km',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (job.ratio != null && job.ratio!.isNotEmpty)
                                Row(
                                  children: [
                                    Icon(Icons.pie_chart, size: 14, color: Colors.grey[600]),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        job.ratio!,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey[600],
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              const SizedBox(height: 6),
                              if (job.deliverAddress != null && job.deliverAddress!.isNotEmpty)
                                Row(
                                  children: [
                                    Icon(Icons.location_city, size: 14, color: Colors.grey[600]),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        '배송지: ${job.deliverAddress}',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey[600],
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                        if (job.phoneNumber != null && job.phoneNumber!.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(left: 8.0),
                            child: SizedBox(
                              width: 48,
                              height: 48,
                              child: ElevatedButton(
                                onPressed: () async {
                                  try {
                                    await makePhoneCall(job.phoneNumber!);
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('전화 연결에 실패했습니다.'),
                                      ),
                                    );
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.grey[100],
                                  foregroundColor: Colors.grey[700],
                                  padding: EdgeInsets.zero,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                                child: const Icon(Icons.phone, size: 14),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }


  static bool _isInWishlist(ProApplyModel job, dynamic user) {
    if (user?.wishList == null) return false;
    return user!.wishList!.any(
          (item) => item['category'] == 'proApply' && item['itemId'] == job.id,
    );
  }

  // 구인 게시물 수정
  static void _editJobPost(BuildContext context, ProApplyModel job) {
    // 상세 페이지로 이동 (상세 페이지에서 수정 버튼 사용)
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProApplyDetailPage(proApplyId: job.id!),
      ),
    );
  }

  // 구인 게시물 삭제
  static void _deleteJobPost(BuildContext context, ProApplyModel job, VoidCallback onRefresh) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: const Text('게시물 삭제'),
          content: const Text('이 게시물을 삭제하시겠습니까?\n삭제된 게시물은 복구할 수 없습니다.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await _performDeleteJobPost(context, job, onRefresh);
              },
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('삭제'),
            ),
          ],
        );
      },
    );
  }

  // 실제 삭제 수행
  static Future<void> _performDeleteJobPost(BuildContext context, ProApplyModel job, VoidCallback onRefresh) async {
    try {
      // Firestore에서 게시물 삭제
      await FirebaseFirestore.instance
          .collection('proApply')
          .doc(job.id)
          .delete();

      // 사용자의 myList에서 항목 제거 (있다면)
      if (job.userKey != null) {
        final userDocRef = FirebaseFirestore.instance
            .collection('users')
            .doc(job.userKey);

        await userDocRef.update({
          'myList': FieldValue.arrayRemove([
            {
              'category': 'proApply',
              'top': 'proApply',
              'middle': 'registration',
              'id': job.id,
            }
          ])
        });
      }

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('게시물이 삭제되었습니다.'),
            backgroundColor: Colors.green,
          ),
        );

        // 페이지 새로고침
        onRefresh();
      }
    } catch (e) {
      print('게시물 삭제 오류: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('게시물 삭제에 실패했습니다.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

/// 인재 탭
class TalentSearchTab extends StatefulWidget {
  final List<String>? initialCategories;
  final List<String>? initialRegions;

  const TalentSearchTab({
    Key? key,
    this.initialCategories,
    this.initialRegions,
  }) : super(key: key);

  @override
  State<TalentSearchTab> createState() => _TalentSearchPageState();
}

class _TalentSearchPageState extends State<TalentSearchTab> {
  final ScrollController _scrollController = ScrollController();

  List<ProfessionalsModel> _allTalents = [];
  List<ProfessionalsModel> _displayedTalents = [];

  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _errorMessage;

  List<String> _selectedCategories = ['전체'];
  List<String> _selectedRegions = []; // 선택된 지역들
  List<String> _selectedDetailJobKeys = [];

  static const int _itemsPerPage = 20;
  int _currentPage = 0;

  DocumentSnapshot? _lastDocument;
  bool _hasMoreData = true;

  @override
  void initState() {
    super.initState();

    if (widget.initialCategories != null && widget.initialCategories!.isNotEmpty) {
      _selectedCategories = List.from(widget.initialCategories!);
    }

    if (widget.initialRegions != null && widget.initialRegions!.isNotEmpty) {
      _selectedRegions = List.from(widget.initialRegions!);
    }

    _scrollController.addListener(_onScroll);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTalents(isRefresh: true);
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.8) {
      _loadMoreTalents();
    }
  }

  Map<String, List<String>> _getGroupedDetailJobs() {
    final Map<String, Set<String>> groupedJobs = {};

    for (var talent in _allTalents) {
      try {
        final topCategory = talent.TopCategories; // 👈 메인 카테고리
        final subCategories = talent.SubCategories; // 👈 세부 직무들

        if (topCategory != null &&
            topCategory.isNotEmpty &&
            subCategories != null &&
            subCategories.isNotEmpty) {

          // TopCategories를 키로 사용
          if (!groupedJobs.containsKey(topCategory)) {
            groupedJobs[topCategory] = {};
          }
          groupedJobs[topCategory]!.addAll(subCategories);
        }
      } catch (e) {
        // 에러 무시
      }
    }

    return groupedJobs.map((key, value) => MapEntry(key, value.toList()..sort()));
  }



  // 🔑 추가: 세부직무 필터 모달
  void _showDetailJobFilterModal() {
    final groupedJobs = _getGroupedDetailJobs();

    if (groupedJobs.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('현재 조건에 해당하는 세부직무가 없습니다.')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        List<String> tempSelectedDetailJobKeys = List.from(_selectedDetailJobKeys);

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.8,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('세부직무 선택', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                              SizedBox(height: 4),
                              Text('원하는 세부직무를 선택하세요', style: TextStyle(fontSize: 14, color: Colors.grey)),
                            ],
                          ),
                        ),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: groupedJobs.entries.map((entry) {
                        final mainCategory = entry.key;
                        final detailJobs = entry.value;

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(top: 16, bottom: 8),
                              child: Text(
                                mainCategory,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF5EBBFF),
                                ),
                              ),
                            ),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: detailJobs.map((detailJob) {
                                // 👇 변경: 고유 키 생성
                                final jobKey = '$mainCategory|$detailJob';
                                final isSelected = tempSelectedDetailJobKeys.contains(jobKey);

                                return InkWell(
                                  onTap: () {
                                    setModalState(() {
                                      if (isSelected) {
                                        tempSelectedDetailJobKeys.remove(jobKey);
                                      } else {
                                        tempSelectedDetailJobKeys.add(jobKey);
                                      }
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFF5EBBFF) : Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: isSelected ? const Color(0xFF5EBBFF) : Colors.grey.shade300,
                                        width: isSelected ? 1.5 : 1,
                                      ),
                                    ),
                                    child: Text(
                                      detailJob,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                        color: isSelected ? Colors.white : const Color(0xFF424242),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                            const Divider(height: 24),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Colors.grey.shade200)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          tempSelectedDetailJobKeys.isEmpty
                              ? '전체 직무'
                              : '선택: ${tempSelectedDetailJobKeys.length}개',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF5EBBFF)),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _selectedDetailJobKeys = tempSelectedDetailJobKeys;
                              _applyClientSideFilters();
                            });
                            Navigator.pop(context);

                            final jobText = tempSelectedDetailJobKeys.isEmpty
                                ? '전체 직무'
                                : '${tempSelectedDetailJobKeys.length}개 직무';
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('$jobText 필터가 적용되었습니다.'),
                                backgroundColor: const Color(0xFF5EBBFF),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF5EBBFF),
                            minimumSize: const Size(120, 50),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('선택 완료',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // 🔑 추가: 클라이언트 사이드 필터링
  void _applyClientSideFilters() {
    _displayedTalents = _allTalents.where((talent) {
      // 세부직무 필터링
      if (_selectedDetailJobKeys.isNotEmpty) {
        final topCategory = talent.TopCategories;
        final subCategories = talent.SubCategories;

        if (topCategory == null ||
            topCategory.isEmpty ||
            subCategories == null ||
            subCategories.isEmpty) {
          return false;
        }

        // 선택된 키를 파싱하여 체크
        bool matchesAny = false;
        for (var key in _selectedDetailJobKeys) {
          final parts = key.split('|');
          if (parts.length == 2) {
            final selectedMainCategory = parts[0];
            final selectedDetailJob = parts[1];

            // TopCategories와 SubCategories 모두 일치해야 함
            if (topCategory == selectedMainCategory &&
                subCategories.contains(selectedDetailJob)) {
              matchesAny = true;
              break;
            }
          }
        }
        if (!matchesAny) return false;
      }

      return true;
    }).toList();

    setState(() {});
  }


  // ========== 인재 로드 (regionCodes 필터링) ==========
  Future<void> _loadTalents({bool isRefresh = false}) async {
    if (_isLoading && !isRefresh) return;

    if (mounted) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
        if (isRefresh) {
          _allTalents.clear();
          _displayedTalents.clear();
          _lastDocument = null;
          _hasMoreData = true;
          _currentPage = 0;
        }
      });
    }

    try {
      Query<Map<String, dynamic>> query = FirebaseFirestore.instance
          .collection('professionals')
          .orderBy('createdDate', descending: true);

      print(_selectedCategories);

      // 💡 카테고리 필터
      if (_selectedCategories.isNotEmpty && !_selectedCategories.contains('전체')) {
        query = query.where('TopCategories', isEqualTo: _selectedCategories.first);
      }

      // 2. 지역 필터 (Array 포함 비교) -> '불평등(Inequality/Array)' 연산
      // 💡 이제 여기서 arrayContainsAny를 쓸 수 있습니다! (직종이 isEqualTo이므로)
      if (_selectedRegions.isNotEmpty) {
        query = query.where('regionCodes', arrayContainsAny: _selectedRegions);
      }

      final countSnapshot = await query.count().get();
      print('실제 데이터 개수: ${countSnapshot.count}');

      // ✅ 공개 설정된 이력서만 필터링
      query = query.where('resumeSettings.isPublic', isEqualTo: true);

      // ✅ 만료되지 않은 이력서만 필터링 (publicEndDate가 오늘 이후)
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day); // 오늘 00:00:00
      query = query.where('resumeSettings.publicEndDate', isGreaterThanOrEqualTo: Timestamp.fromDate(today));

      if (_lastDocument != null && !isRefresh) {
        query = query.startAfterDocument(_lastDocument!);
      }

      query = query.limit(_itemsPerPage);

      final snapshot = await query.get();



      if (snapshot.docs.isNotEmpty) {
        _lastDocument = snapshot.docs.last;
        _hasMoreData = snapshot.docs.length >= _itemsPerPage;
      } else {
        _hasMoreData = false;
      }

      final talents = snapshot.docs
          .map((doc) {
        try {
          return ProfessionalsModel.fromQuerySnapshot(doc);
        } catch (e) {
          return null;
        }
      })
          .whereType<ProfessionalsModel>()
          .toList();

      if (mounted) {
        setState(() {
          if (isRefresh) {
            _allTalents = talents;
          } else {
            _allTalents.addAll(talents);
          }
          _displayedTalents = _allTalents;
        });
      }
    } catch (e) {
      print('데이터 로드 오류: $e');
      if (mounted) {
        setState(() {
          _errorMessage = '데이터를 불러오는데 실패했습니다.\n잠시 후 다시 시도해주세요.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadMoreTalents() async {
    if (_isLoadingMore || !_hasMoreData || _isLoading) return;

    if (mounted) {
      setState(() {
        _isLoadingMore = true;
      });
    }

    try {
      await _loadTalents(isRefresh: false);
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
        });
      }
    }
  }

  // ========== 카테고리 필터 모달 ==========
  void _showCategoryFilterModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        List<String> tempSelected = List.from(_selectedCategories);

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.7,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text('직종 선택', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                        ),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        // 전체 선택
                        CheckboxListTile(
                          title: const Text('전체'),
                          value: tempSelected.contains('전체'),
                          activeColor: const Color(0xFF7C3AED),
                          onChanged: (checked) {
                            setModalState(() {
                              if (checked!) {
                                tempSelected = ['전체'];
                              } else {
                                tempSelected.clear();
                              }
                            });
                          },
                        ),
                        const Divider(),
                        // 직종 목록
                        ...deliveryList.map((category) {
                          final isSelected = tempSelected.contains(category);
                          return CheckboxListTile(
                            title: Text(category),
                            value: isSelected,
                            activeColor: const Color(0xFF7C3AED),
                            onChanged: (checked) {
                              setModalState(() {
                                tempSelected.remove('전체');
                                if (checked!) {
                                  tempSelected.add(category);
                                } else {
                                  tempSelected.remove(category);
                                }
                                if (tempSelected.isEmpty) {
                                  tempSelected = ['전체'];
                                }
                              });
                            },
                          );
                        }),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Colors.grey.shade200)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              setModalState(() {
                                tempSelected = ['전체'];
                              });
                            },
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 54),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('초기화', style: TextStyle(fontSize: 16)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: () {
                              setState(() {
                                _selectedCategories = tempSelected;
                              });
                              Navigator.pop(context);
                              _loadTalents(isRefresh: true);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF7C3AED),
                              minimumSize: const Size(0, 54),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('적용',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // ========== 지역 필터 모달 (희망근무지와 동일한 디자인) ==========
  void _showRegionFilterModal() {
    String selectedParentRegion = '서울';
    List<String> tempSelectedRegions = List.from(_selectedRegions);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final currentRegion = hierarchicalRegions.firstWhere(
                (r) => r['name'] == selectedParentRegion,
            orElse: () => hierarchicalRegions.first,
          );
          final subRegions = List<String>.from(currentRegion['subRegions'] ?? <String>[]);

          return Container(
            height: MediaQuery.of(context).size.height * 0.88,
            decoration: const BoxDecoration(
              color: Color(0xFFFFFFFF),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('근무 가능 지역 선택', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                            SizedBox(height: 4),
                            Text('인재가 근무 가능한 지역을 선택하세요', style: TextStyle(fontSize: 14, color: Colors.grey)),
                          ],
                        ),
                      ),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: Row(
                    children: [
                      // 좌측 - 시/도 선택
                      Container(
                        width: 120,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          border: Border(right: BorderSide(color: Colors.grey.shade200)),
                        ),
                        child: ListView(
                          padding: EdgeInsets.zero,
                          children: hierarchicalRegions.map((item) {
                            final region = item['name'] as String;
                            final isSelected = selectedParentRegion == region;
                            return InkWell(
                              onTap: () => setModalState(() => selectedParentRegion = region),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.white : Colors.grey.shade50,
                                  border: Border(
                                    left: BorderSide(
                                      color: isSelected ? const Color(0xFF7C3AED) : Colors.transparent,
                                      width: 4,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  region,
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFF424242),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      // 우측 - 시/군/구 선택
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 전체 지역 선택
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: tempSelectedRegions.isEmpty
                                      ? const Color(0xFFF3E8FF)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: tempSelectedRegions.isEmpty
                                        ? const Color(0xFF7C3AED)
                                        : Colors.grey.shade300,
                                  ),
                                ),
                                child: CheckboxListTile(
                                  title: const Text('전체 지역', style: TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: const Text('모든 지역의 인재 보기', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                  activeColor: const Color(0xFF7C3AED),
                                  value: tempSelectedRegions.isEmpty,
                                  onChanged: (checked) {
                                    setModalState(() {
                                      if (checked!) {
                                        tempSelectedRegions.clear();
                                      }
                                    });
                                  },
                                ),
                              ),
                            ),
                            const Divider(height: 1),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(
                                '$selectedParentRegion 내 세부 지역 선택',
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                              ),
                            ),
                            const Divider(height: 1),
                            Expanded(
                              child: SingleChildScrollView(
                                padding: const EdgeInsets.all(16),
                                child: Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: subRegions.map((subRegion) {
                                    final fullLocation = '$selectedParentRegion $subRegion';
                                    final isSelected = tempSelectedRegions.contains(fullLocation);

                                    return InkWell(
                                      onTap: () {
                                        setModalState(() {
                                          if (isSelected) {
                                            tempSelectedRegions.remove(fullLocation);
                                          } else {
                                            tempSelectedRegions.add(fullLocation);
                                          }
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: isSelected ? const Color(0xFF7C3AED) : Colors.white,
                                          borderRadius: BorderRadius.circular(24),
                                          border: Border.all(
                                            color: isSelected ? const Color(0xFF7C3AED) : Colors.grey.shade300,
                                            width: isSelected ? 1.5 : 1,
                                          ),
                                        ),
                                        child: Text(
                                          subRegion,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                            color: isSelected ? Colors.white : const Color(0xFF424242),
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Colors.grey.shade200)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        tempSelectedRegions.isEmpty
                            ? '전체 지역'
                            : '선택된 지역: ${tempSelectedRegions.length}개',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF7C3AED)),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _selectedRegions = tempSelectedRegions;
                          });
                          Navigator.pop(context);
                          _loadTalents(isRefresh: true);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7C3AED),
                          minimumSize: const Size(120, 50),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('선택 완료',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ========== 위시리스트 토글 ==========
  Future<void> _toggleWishlist(ProfessionalsModel talent) async {
    final userNotifier = context.read<UserNotifier>();
    final user = userNotifier.userModel;

    if (user == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('로그인이 필요합니다.')),
        );
      }
      return;
    }

    try {
      final userRef = FirebaseFirestore.instance.collection('users').doc(user.userKey);
      final wishlistItem = {
        'category': 'professionals',
        'itemId': talent.id,
        'middle': 'professionals',
        'top': 'professionals',
      };

      print('💾 구인구직 찜 목록에 추가하는 데이터: $wishlistItem');

      final userDoc = await userRef.get();
      final currentWishlist = List<Map<String, dynamic>>.from(
        userDoc.data()?['wishList'] ?? [],
      );

      final existingIndex = currentWishlist.indexWhere(
            (item) => item['category'] == 'professionals' && item['itemId'] == talent.id,
      );

      if (existingIndex != -1) {
        currentWishlist.removeAt(existingIndex);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('위시리스트에서 제거되었습니다.')),
          );
        }
      } else {
        currentWishlist.add(wishlistItem);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('위시리스트에 추가되었습니다.')),
          );
        }
      }

      await userRef.update({'wishList': currentWishlist});
      await userNotifier.refreshUser();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('위시리스트 업데이트에 실패했습니다')),
        );
      }
    }
  }

  bool _isInWishlist(ProfessionalsModel talent, dynamic user) {
    if (user?.wishList == null) return false;
    return user!.wishList!.any(
          (item) => item['category'] == 'professionals' && item['itemId'] == talent.id,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: Column(
        children: [
          _buildFilterSection(),
          Expanded(
            child: _buildTalentList(),
          ),
        ],
      ),
    );
  }

  // ========== 필터 섹션 ==========
  Widget _buildFilterSection() {
    final groupedJobs = _getGroupedDetailJobs();
    final hasDetailJobs = groupedJobs.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showCategoryFilterModal,
                  icon: const Icon(Icons.work_outline, size: 20),
                  label: Text(
                    _selectedCategories.contains('전체')
                        ? '직종 선택'
                        : '${_selectedCategories.length}개 직종',
                    style: const TextStyle(fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    side: const BorderSide(color: Color(0xFF008000)),
                    foregroundColor: const Color(0xFF008000),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showRegionFilterModal,
                  icon: const Icon(Icons.location_on_outlined, size: 20),
                  label: Text(
                    _selectedRegions.isEmpty ? '전체 지역' : '${_selectedRegions.length}개 지역',
                    style: const TextStyle(fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    side: const BorderSide(color: Color(0xFF008000)),
                    foregroundColor: const Color(0xFF008000),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '총 ${_displayedTalents.length}명',
                style: const TextStyle(
                  color: Color(0xFF7C3AED),
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              Row(
                children: [
                  // 👇 필터 초기화 버튼
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _selectedCategories = ['전체'];
                        _selectedRegions = [];
                        _selectedDetailJobKeys = []; // 👈 추가
                      });
                      _loadTalents(isRefresh: true);
                    },
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('필터 초기화'),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.grey[600],
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (hasDetailJobs)
                    GestureDetector(
                      onTap: _showDetailJobFilterModal,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _selectedDetailJobKeys.isEmpty
                              ? Colors.grey[100]
                              : const Color(0xFF5EBBFF).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: _selectedDetailJobKeys.isEmpty
                                ? Colors.grey[300]!
                                : const Color(0xFF5EBBFF),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _selectedDetailJobKeys.isEmpty
                                  ? '세부직무'
                                  : '세부직무 ${_selectedDetailJobKeys.length}',
                              style: TextStyle(
                                fontSize: 11,
                                color: _selectedDetailJobKeys.isEmpty
                                    ? Colors.grey[800]
                                    : const Color(0xFF5EBBFF),
                                fontWeight: _selectedDetailJobKeys.isEmpty
                                    ? FontWeight.w500
                                    : FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(
                              Icons.keyboard_arrow_down,
                              size: 14,
                              color: _selectedDetailJobKeys.isEmpty
                                  ? Colors.grey
                                  : const Color(0xFF5EBBFF),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ========== 인재 리스트 ==========
  Widget _buildTalentList() {
    if (_isLoading && _displayedTalents.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Color(0xFF7C3AED)),
            SizedBox(height: 16),
            Text('인재 정보를 불러오는 중...'),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.red[600]),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _loadTalents(isRefresh: true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
              ),
              child: const Text('다시 시도'),
            ),
          ],
        ),
      );
    }

    if (_displayedTalents.isEmpty && !_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person_off, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              '조건에 맞는 인재가 없습니다',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              '필터 조건을 변경해보세요',
              style: TextStyle(color: Colors.grey[500]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadTalents(isRefresh: true),
      color: const Color(0xFF7C3AED),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(12),
        itemCount: _displayedTalents.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _displayedTalents.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
              ),
            );
          }

          final talent = _displayedTalents[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: _buildTalentCard(talent),
          );
        },
      ),
    );
  }

  // ========== 인재 카드 ==========
  Widget _buildTalentCard(ProfessionalsModel talent) {
    final hasImage = talent.profileImageUrl != null && talent.profileImageUrl!.isNotEmpty;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProfessionalsDetailPage(professionalsId: talent.id!),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              spreadRadius: 0,
              blurRadius: 8,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 이미지
            if (hasImage)
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    talent.profileImageUrl ?? '',
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: 80,
                        height: 80,
                        color: Colors.grey[200],
                        child: const Icon(Icons.person, size: 40, color: Colors.grey),
                      );
                    },
                  ),
                ),
              ),
            // 정보
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 이름 + 더보기 + 하트
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            talent.username ?? '이름 없음',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Consumer<UserNotifier>(
                          builder: (context, userNotifier, child) {
                            final currentUser = userNotifier.userModel;
                            final isOwner = currentUser?.userKey == talent.userKey;
                            final isAdmin = currentUser?.userKey == 'cYjFpXKkvhe4vt4FU26XtMHwm1j2';
                            final canEdit = isOwner || isAdmin;
                            final isInWishlist = _isInWishlist(talent, userNotifier.userModel);

                            return Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (canEdit)
                                  PopupMenuButton<String>(
                                    onSelected: (value) {
                                      if (value == 'edit') {
                                        _editTalentPost(context, talent);
                                      } else if (value == 'delete') {
                                        _deleteTalentPost(context, talent);
                                      }
                                    },
                                    itemBuilder: (context) => [
                                      const PopupMenuItem(
                                        value: 'edit',
                                        child: Row(
                                          children: [
                                            Icon(Icons.edit, size: 16),
                                            SizedBox(width: 8),
                                            Text('수정'),
                                          ],
                                        ),
                                      ),
                                      const PopupMenuItem(
                                        value: 'delete',
                                        child: Row(
                                          children: [
                                            Icon(Icons.delete, size: 16, color: Colors.red),
                                            SizedBox(width: 8),
                                            Text('삭제', style: TextStyle(color: Colors.red)),
                                          ],
                                        ),
                                      ),
                                    ],
                                    child: Icon(
                                      Icons.more_vert,
                                      color: Colors.grey[600],
                                      size: 20,
                                    ),
                                  ),
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: () => _toggleWishlist(talent),
                                  child: Icon(
                                    isInWishlist ? Icons.favorite : Icons.favorite_border,
                                    color: isInWishlist ? Colors.red : Colors.grey[400],
                                    size: 20,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // 직종 태그
                    if (talent.SubCategories != null && talent.SubCategories!.isNotEmpty)
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: talent.SubCategories!.take(2).map((category) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3E8FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              category,
                              style: const TextStyle(
                                color: Color(0xFF7C3AED),
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    const SizedBox(height: 8),
                    // 경력
                    if (talent.career != null && talent.career!.isNotEmpty)
                      Text(
                        talent.career!,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[700],
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 8),
                    // 지역 + 전화 버튼
                    Row(
                      children: [
                        Expanded(
                          child: talent.regionCodes != null && talent.regionCodes!.isNotEmpty
                              ? Row(
                            children: [
                              Icon(Icons.location_on, size: 14, color: Colors.grey[500]),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  talent.regionCodes!.join(', '),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          )
                              : const SizedBox.shrink(),
                        ),
                        if (talent.phoneNumber != null && talent.phoneNumber!.isNotEmpty)
                          SizedBox(
                            width: 40,
                            height: 40,
                            child: ElevatedButton(
                              onPressed: () async {
                                try {
                                  await makePhoneCall(talent.phoneNumber!);
                                } catch (e) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('전화 연결에 실패했습니다.')),
                                  );
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.grey[100],
                                foregroundColor: Colors.grey[700],
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                elevation: 0,
                              ),
                              child: const Icon(Icons.phone, size: 18),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 인재 게시물 수정
  void _editTalentPost(BuildContext context, ProfessionalsModel talent) {
    // 상세 페이지로 이동 (상세 페이지에서 수정 버튼 사용)
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProfessionalsDetailPage(professionalsId: talent.id!),
      ),
    );
  }

  // 인재 게시물 삭제
  void _deleteTalentPost(BuildContext context, ProfessionalsModel talent) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: const Text('게시물 삭제'),
          content: const Text('이 게시물을 삭제하시겠습니까?\n삭제된 게시물은 복구할 수 없습니다.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await _performDeleteTalentPost(context, talent);
              },
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('삭제'),
            ),
          ],
        );
      },
    );
  }

  // 실제 인재 게시물 삭제 수행
  Future<void> _performDeleteTalentPost(BuildContext context, ProfessionalsModel talent) async {
    try {
      // Firestore에서 게시물 삭제
      await FirebaseFirestore.instance
          .collection('professionals')
          .doc(talent.id)
          .delete();

      // 사용자의 myList에서 항목 제거 (있다면)
      if (talent.userKey != null) {
        final userDocRef = FirebaseFirestore.instance
            .collection('users')
            .doc(talent.userKey);

        await userDocRef.update({
          'myList': FieldValue.arrayRemove([
            {
              'category': 'professionals',
              'top': 'professionals',
              'middle': 'registration',
              'id': talent.id,
            }
          ])
        });
      }

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('게시물이 삭제되었습니다.'),
            backgroundColor: Colors.green,
          ),
        );

        // 리스트 새로고침
        setState(() {
          _allTalents.removeWhere((t) => t.id == talent.id);
          _displayedTalents.removeWhere((t) => t.id == talent.id);
        });
      }
    } catch (e) {
      print('게시물 삭제 오류: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('게시물 삭제에 실패했습니다.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}