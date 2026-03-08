import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:yongcar/constants/industry_data.dart';
import 'package:intl/intl.dart';
import '../services/kakao_map_service.dart';
import '../services/gemini_service.dart';
import 'package:geoflutterfire_plus/geoflutterfire_plus.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class ApplyPageJobForm extends StatefulWidget {
  final bool isJobDetailSectionExpanded;
  final Map<String, dynamic> jobFormData;
  final List<String> selectedJobNames;
  final List<String> selectedSubCategories;
  final Map<String, TextEditingController> controllers;
  final Function(bool) onJobDetailSectionExpandedChanged;
  final Function(Map<String, dynamic>) onJobFormDataChanged;
  final Function(Map<String, dynamic>) onLocationDataChanged;
  final Function(List<String>) onJobNamesChanged;
  final Function(Map<String, dynamic>)? onAIDataParsed;

  const ApplyPageJobForm({
    Key? key,
    required this.isJobDetailSectionExpanded,
    required this.jobFormData,
    required this.selectedJobNames,
    required this.selectedSubCategories,
    required this.controllers,
    required this.onJobDetailSectionExpandedChanged,
    required this.onJobFormDataChanged,
    required this.onLocationDataChanged,
    required this.onJobNamesChanged,
    this.onAIDataParsed,
  }) : super(key: key);

  @override
  _ApplyPageJobFormState createState() => _ApplyPageJobFormState();
}

class _ApplyPageJobFormState extends State<ApplyPageJobForm> {
  bool hasLicense = false;
  bool hasClassificationHelper = false;

  // 배송지 비율 관리
  Map<String, TextEditingController> ratioControllers = {
    '아파트': TextEditingController(),
    '일반번지': TextEditingController(),
    '원룸': TextEditingController(),
  };

  // 주소 검색 관련
  List<Map<String, dynamic>> _deliverAddressResults = [];
  List<Map<String, dynamic>> _terminalAddressResults = [];
  bool _isDeliverAddressLoading = false;
  bool _isTerminalAddressLoading = false;
  String _deliverAddressError = '';
  String _terminalAddressError = '';

  void _updateJobFormData(String key, dynamic value) {
    final updatedData = Map<String, dynamic>.from(widget.jobFormData);
    updatedData[key] = value;
    widget.onJobFormDataChanged(updatedData);
  }

  @override
  void initState() {
    super.initState();

    // 기존 데이터로 초기화
    hasLicense = widget.jobFormData['hasLicense'] ?? false;
    hasClassificationHelper = widget.jobFormData['hasClassificationHelper'] ?? false;

    // 배송지 비율 초기화
    final ratioData = widget.jobFormData['ratioData'] as Map<String, String>? ?? {};
    ratioControllers['아파트']?.text = ratioData['아파트'] ?? '';
    ratioControllers['일반번지']?.text = ratioData['일반번지'] ?? '';
    ratioControllers['원룸']?.text = ratioData['원룸'] ?? '';

    // 마감일 컨트롤러 초기화
    if (!widget.controllers.containsKey('deadline_startDate')) {
      widget.controllers['deadline_startDate'] = TextEditingController();
    }
    if (!widget.controllers.containsKey('deadline_endDate')) {
      widget.controllers['deadline_endDate'] = TextEditingController();
    }
  }

  @override
  void dispose() {
    ratioControllers.values.forEach((controller) => controller.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 헤더
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              widget.onJobDetailSectionExpandedChanged(!widget.isJobDetailSectionExpanded);
            },
            child: Container(
              color: Colors.transparent,
              child: Row(
                children: [
                  Container(
                    width: 3,
                    height: 18,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2196F3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    '상세 정보',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1a1a1a),
                    ),
                  ),
                  const Spacer(),
                  AnimatedRotation(
                    turns: widget.isJobDetailSectionExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 300),
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      color: Color(0xFF6C757D),
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 배송업 정보 입력 영역
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: widget.isJobDetailSectionExpanded ? null : 0,
            child: widget.isJobDetailSectionExpanded
                ? Container(
              margin: const EdgeInsets.only(top: 16),
              child: Column(
                children: [
                  // AI 자동입력 버튼
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 20),
                    child: ElevatedButton.icon(
                      onPressed: () => _handleAIAutoFill(context),
                      icon: const Icon(Icons.auto_awesome, size: 18),
                      label: const Text(
                        '구인글 복사 AI 자동 입력',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 2,
                      ),
                    ),
                  ),

                  // 고용형태 (복수선택)
                  _buildJobNamesField(),
                  const SizedBox(height: 16),

                  // 업무 정보
                  _buildWorkInfoSection(),
                  const SizedBox(height: 16),

                  // 급여/수익 정보
                  _buildSalaryInfoSection(),
                  const SizedBox(height: 16),

                  // 주소 정보
                  _buildAddressInfoSection(),
                  const SizedBox(height: 16),

                  // 마감일
                  _buildDeadlineSection(),
                  const SizedBox(height: 16),

                  // 연락처
                  _buildPhoneField(),
                  const SizedBox(height: 16),

                  // 상세설명
                  _buildDetailField(),
                ],
              ),
            )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildJobNamesField() {
    // 복수 그룹화 선택
    List<String> allJobNames = [];

    for (String jobCategory in widget.selectedSubCategories) {
      if (jobCategory != '전체' && jobCategories.containsKey(jobCategory)) {
        final jobList = jobCategories[jobCategory]!;
        for (String jobName in jobList) {
          allJobNames.add('$jobCategory - $jobName');
        }
      }
    }

    allJobNames = allJobNames.toSet().toList();

    if (allJobNames.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text('먼저 하위업종을 선택해주세요'),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.category_outlined, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              const Text(
                '직무분야 (복수 선택 가능)',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6C757D),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 카테고리별로 그룹화해서 표시
          ...widget.selectedSubCategories.where((cat) => cat != '전체').map((category) {
            if (!jobCategories.containsKey(category)) return const SizedBox();

            final jobs = jobCategories[category]!;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    category,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                ),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: jobs.map((jobName) {
                    final fullJobName = '$category - $jobName';
                    final isSelected = widget.selectedJobNames.contains(fullJobName);
                    return GestureDetector(
                      onTap: () {
                        final newJobNames = List<String>.from(widget.selectedJobNames);
                        if (isSelected) {
                          newJobNames.remove(fullJobName);
                        } else {
                          newJobNames.add(fullJobName);
                        }
                        widget.onJobNamesChanged(newJobNames);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF10B981) : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF10B981) : const Color(0xFFE5E7EB),
                          ),
                        ),
                        child: Text(
                          jobName,
                          style: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF374151),
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
              ],
            );
          }).toList(),
        ],
      ),
    );
  }



  Widget _buildWorkInfoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '업무 정보',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 12),

        // 대리점명
        _buildInputField(
            '대리점명',
            Icons.business,
            widget.controllers['company']!,
            hintText: '대리점명을 입력해주세요'
        ),
        const SizedBox(height: 12),

        // 화물운송자격증 (체크박스)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Row(
            children: [
              Icon(Icons.verified_outlined, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              const Text(
                '화물운송자격증',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6C757D),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Transform.scale(
                scale: 0.8,
                child: Switch(
                  value: hasLicense,
                  onChanged: (value) {
                    setState(() {
                      hasLicense = value;
                      _updateJobFormData('hasLicense', value);
                    });
                  },
                  activeColor: const Color(0xFF4F46E5),
                ),
              ),
              Text(
                hasLicense ? '필요' : '불필요',
                style: TextStyle(
                  fontSize: 12,
                  color: hasLicense ? const Color(0xFF4F46E5) : Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 근무시간 (시간 선택)
        _buildWorkHoursField(),
        const SizedBox(height: 12),

        // 휴일
        _buildInputField(
            '휴일',
            Icons.event_available_outlined,
            widget.controllers['holiday']!,
            hintText: '휴일 정보를 입력해주세요'
        ),
        const SizedBox(height: 12),

        // 분류도우미 유무 (체크박스)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Row(
            children: [
              Icon(Icons.swap_vert, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              const Text(
                '분류도우미',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6C757D),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Transform.scale(
                scale: 0.8,
                child: Switch(
                  value: hasClassificationHelper,
                  onChanged: (value) {
                    setState(() {
                      hasClassificationHelper = value;
                      _updateJobFormData('hasClassificationHelper', value);
                    });
                  },
                  activeColor: const Color(0xFF4F46E5),
                ),
              ),
              Text(
                hasClassificationHelper ? '있음' : '없음',
                style: TextStyle(
                  fontSize: 12,
                  color: hasClassificationHelper ? const Color(0xFF4F46E5) : Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSalaryInfoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '급여/수익 정보',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 12),

        // 월 수익
        _buildInputField(
            '월 수익',
            Icons.payments_outlined,
            widget.controllers['monthlyIncome']!,
            hintText: '월 수익을 입력해주세요',
            keyboardType: TextInputType.number
        ),
        const SizedBox(height: 12),

        // 총 배송물량
        _buildInputField(
            '총 배송물량',
            Icons.local_shipping,
            widget.controllers['totalVolume']!,
            hintText: '총 배송물량을 입력해주세요'
        ),
        const SizedBox(height: 12),

        // 배송지 비율
        _buildDeliveryRatioField(),
      ],
    );
  }

  Widget _buildAddressInfoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '주소 정보',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 12),

        // 배송지 주소 (주소 검색)
        _buildAddressSearchField(
          '배송지 주소',
          Icons.location_city,
          widget.controllers['deliverAddress']!,
          _deliverAddressResults,
          _isDeliverAddressLoading,
          _deliverAddressError,
          'deliver',
        ),
        const SizedBox(height: 12),

        // 터미널 주소 (주소 검색)
        _buildAddressSearchField(
          '터미널 주소',
          Icons.warehouse_outlined,
          widget.controllers['terminalAddress']!,
          _terminalAddressResults,
          _isTerminalAddressLoading,
          _terminalAddressError,
          'terminal',
        ),
      ],
    );
  }

  Widget _buildWorkHoursField() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.schedule_outlined, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              const Text(
                '근무시간',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6C757D),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: widget.controllers['workHours_start'],
                  decoration: _inputDecoration('시작 시간'),
                  readOnly: true,
                  onTap: () => _selectTime(context, 'start'),
                ),
              ),
              const SizedBox(width: 8),
              const Text('~'),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  controller: widget.controllers['workHours_end'],
                  decoration: _inputDecoration('종료 시간'),
                  readOnly: true,
                  onTap: () => _selectTime(context, 'end'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryRatioField() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.pie_chart_outline_rounded, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              const Text(
                '배송지 비율',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6C757D),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...ratioControllers.entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 80,
                    child: Text(
                      entry.key,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: TextFormField(
                        controller: entry.value,
                        decoration: InputDecoration(
                          hintText: '비율 입력',
                          suffixText: '%',
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) {
                          final ratioData = <String, String>{};
                          ratioControllers.forEach((key, controller) {
                            ratioData[key] = controller.text;
                          });
                          _updateJobFormData('ratioData', ratioData);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildAddressSearchField(
      String label,
      IconData icon,
      TextEditingController controller,
      List<Map<String, dynamic>> results,
      bool isLoading,
      String error,
      String type,
      ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: TextFormField(
                    controller: controller,
                    decoration: InputDecoration(
                      hintText: '$label을 검색해주세요',
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                    ),
                    onChanged: (value) {
                      if (value.isNotEmpty) {
                        _searchAddress(value, type);
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => _getCurrentLocation(type),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  padding: const EdgeInsets.all(12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Icon(Icons.my_location, size: 16, color: Colors.white),
              ),
            ],
          ),

          if (isLoading) ...[
            const SizedBox(height: 8),
            const Center(child: CircularProgressIndicator()),
          ],

          if (error.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(error, style: const TextStyle(color: Colors.red, fontSize: 12)),
          ],

          if (results.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              constraints: const BoxConstraints(maxHeight: 200),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: results.length,
                itemBuilder: (context, index) {
                  final address = results[index];
                  return ListTile(
                    title: Text(
                      address['juso'] ?? '',
                      style: const TextStyle(fontSize: 14),
                    ),
                    onTap: () => _selectAddress(address, type),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDeadlineSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '마감일',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 12),

        // 마감일 유형 선택
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.calendar_today_outlined, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  const Text(
                    '마감일 유형',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6C757D),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: widget.jobFormData['deadline']?['type'] ?? '마감일 지정',
                decoration: _inputDecoration('마감일 유형 선택'),
                items: ['마감일 지정', '채용시 마감', '상시채용'].map((type) {
                  return DropdownMenuItem(value: type, child: Text(type));
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    final updatedDeadline = Map<String, dynamic>.from(widget.jobFormData['deadline'] ?? {});
                    updatedDeadline['type'] = value;
                    _updateJobFormData('deadline', updatedDeadline);
                  }
                },
              ),

              // 마감일 지정일 때만 날짜 필드 표시
              if (widget.jobFormData['deadline']?['type'] == '마감일 지정') ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: widget.controllers['deadline_startDate'],
                        decoration: _inputDecoration('시작일'),
                        readOnly: true,
                        onTap: () => _selectDate(context, 'startDate'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextFormField(
                        controller: widget.controllers['deadline_endDate'],
                        decoration: _inputDecoration('종료일'),
                        readOnly: true,
                        onTap: () => _selectDate(context, 'endDate'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPhoneField() {
    return _buildInputField(
        '연락처 *',
        Icons.phone_outlined,
        widget.controllers['phoneNumber']!,
        hintText: '연락처를 입력해주세요',
        keyboardType: TextInputType.phone,
        required: true
    );
  }

  Widget _buildDetailField() {
    return _buildInputField(
        '상세설명',
        Icons.description_outlined,
        widget.controllers['detail']!,
        hintText: '추가 상세설명을 입력해주세요',
        maxLines: 4
    );
  }

  Widget _buildInputField(String label, IconData icon, TextEditingController controller, {
    String? hintText,
    TextInputType? keyboardType,
    int maxLines = 1,
    bool required = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (required)
                const Text(' *', style: TextStyle(color: Colors.red, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: TextFormField(
              controller: controller,
              keyboardType: keyboardType,
              maxLines: maxLines,
              decoration: InputDecoration(
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                hintText: hintText,
                hintStyle: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 14,
                ),
              ),
              validator: required ? (value) {
                if (value == null || value.isEmpty) {
                  return '$label을(를) 입력해주세요';
                }
                return null;
              } : null,
            ),
          ),
        ],
      ),
    );
  }

  void _selectTime(BuildContext context, String type) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );

    if (picked != null) {
      final timeString = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      widget.controllers['workHours_$type']?.text = timeString;

      final workHours = Map<String, String>.from(widget.jobFormData['workHours'] ?? {});
      workHours[type == 'start' ? 'startTime' : 'endTime'] = timeString;
      _updateJobFormData('workHours', workHours);
    }
  }

  void _selectDate(BuildContext context, String dateType) async {
    final currentText = widget.controllers['deadline_$dateType']?.text ?? '';
    final initialDate = DateTime.tryParse(currentText) ?? DateTime.now();

    final date = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );

    if (date != null) {
      final formattedDate = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      widget.controllers['deadline_$dateType']?.text = formattedDate;

      final updatedDeadline = Map<String, dynamic>.from(widget.jobFormData['deadline'] ?? {});
      updatedDeadline[dateType] = formattedDate;
      _updateJobFormData('deadline', updatedDeadline);
    }
  }

  void _searchAddress(String query, String type) async {
    if (query.trim().isEmpty) return;

    if (type == 'deliver') {
      setState(() {
        _isDeliverAddressLoading = true;
        _deliverAddressError = '';
        _deliverAddressResults = [];
      });
    } else {
      setState(() {
        _isTerminalAddressLoading = true;
        _terminalAddressError = '';
        _terminalAddressResults = [];
      });
    }

    try {
      final results = await KakaoMapService.searchAll(query.trim());
      setState(() {
        if (type == 'deliver') {
          _deliverAddressResults = results;
          if (results.isEmpty) {
            _deliverAddressError = '검색 결과가 없습니다.';
          }
        } else {
          _terminalAddressResults = results;
          if (results.isEmpty) {
            _terminalAddressError = '검색 결과가 없습니다.';
          }
        }
      });
    } catch (e) {
      setState(() {
        if (type == 'deliver') {
          _deliverAddressError = '주소 검색 중 오류가 발생했습니다.';
        } else {
          _terminalAddressError = '주소 검색 중 오류가 발생했습니다.';
        }
      });
    } finally {
      setState(() {
        if (type == 'deliver') {
          _isDeliverAddressLoading = false;
        } else {
          _isTerminalAddressLoading = false;
        }
      });
    }
  }

  void _getCurrentLocation(String type) async {
    // 현재 위치 기반 주소 검색 구현
    // KakaoMapService.coord2Address 사용
  }

  void _selectAddress(Map<String, dynamic> address, String type) {
    final addressText = address['juso'] ?? '';
    final lat = double.tryParse(address['y'] ?? '0.0') ?? 0.0;
    final lng = double.tryParse(address['x'] ?? '0.0') ?? 0.0;

    if (type == 'deliver') {
      widget.controllers['deliverAddress']?.text = addressText;
      setState(() {
        _deliverAddressResults = [];
      });

      // 배송지 주소가 선택되면 메인 위치 정보도 업데이트
      if (lat != 0.0 && lng != 0.0) {
        final geoFirePoint = GeoFirePoint(GeoPoint(lat, lng));
        widget.onLocationDataChanged({
          'address': addressText,
          'geoFirePoint': geoFirePoint.data,
          'latitude': lat,
          'longitude': lng,
        });
      }
    } else {
      widget.controllers['terminalAddress']?.text = addressText;
      setState(() {
        _terminalAddressResults = [];
      });
    }
  }

  InputDecoration _inputDecoration(String hintText) {
    return InputDecoration(
      hintText: hintText,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.grey[200]!),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.grey[200]!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFF4F46E5)),
      ),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    );
  }

  Future<void> _handleAIAutoFill(BuildContext context) async {
    // 메시지 입력 다이얼로그 표시
    final messageController = TextEditingController();
    
    final String? inputMessage = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: Color(0xFF6366F1),
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'AI 자동 입력',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '카카오톡에서 복사한 구인 관련 메시지를 붙여넣어 주세요.',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE5E7EB)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                controller: messageController,
                maxLines: 8,
                decoration: const InputDecoration(
                  hintText: '예시:\nCJ대한통운 택배기사 모집\n서울 강남구 일대\n월수익 400만원\n오전 6시 - 오후 2시\n연락처: 010-1234-5678',
                  hintStyle: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 13,
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.all(16),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              '취소',
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              final message = messageController.text.trim();
              if (message.isNotEmpty) {
                Navigator.of(context).pop(message);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: const Text(
              'AI 분석',
              style: TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (inputMessage == null || inputMessage.isEmpty) {
      return;
    }

    try {
      // 로딩 다이얼로그 표시
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('AI가 메시지를 분석중입니다...'),
                ],
              ),
            ),
          ),
        ),
      );

      // Gemini API로 구인 메시지 파싱
      final parsedData = await GeminiService.parseJobMessage(inputMessage);

      Navigator.of(context).pop(); // 로딩 다이얼로그 닫기

      if (parsedData != null) {
        // 파싱된 데이터를 부모 위젯으로 전달
        if (widget.onAIDataParsed != null) {
          widget.onAIDataParsed!(parsedData);
        }

        // 성공 메시지 및 확인 다이얼로그 표시
        _showSuccessDialog(context, parsedData);
      } else {
        _showErrorDialog(context, 'AI가 메시지를 분석할 수 없습니다.\n다른 메시지로 다시 시도해주세요.');
      }
    } catch (e) {
      Navigator.of(context).pop(); // 로딩 다이얼로그 닫기 (혹시 열려있다면)
      _showErrorDialog(context, 'AI 분석 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
    }
  }

  void _showSuccessDialog(BuildContext context, Map<String, dynamic> parsedData) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.check_circle,
                color: Colors.green,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'AI 분석 완료',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AI가 메시지를 성공적으로 분석했습니다.\n구인 정보가 자동으로 입력되었습니다.',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: const Text(
              '확인',
              style: TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(BuildContext context, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.error,
                color: Colors.red,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'AI 분석 실패',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: const Text(
              '확인',
              style: TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}