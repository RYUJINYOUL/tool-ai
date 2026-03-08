import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:location/location.dart';
import 'package:yongcar/constants/industry_data.dart';
import 'package:geoflutterfire_plus/geoflutterfire_plus.dart';
import '../services/kakao_map_service.dart';
import '../services/gemini_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class ApplyPageDynamicFields extends StatefulWidget {
  final String englishCategoryToSave;
  final bool isDetailSectionExpanded;
  final Map<String, TextEditingController> controllers;
  final List<String> selectedSubCategories;
  final Function(bool) onDetailSectionExpandedChanged;
  final Function(Map<String, dynamic>) onLocationDataChanged;
  final Function(Map<String, dynamic>)? onAIDataParsed;

  const ApplyPageDynamicFields({
    Key? key,
    required this.englishCategoryToSave,
    required this.isDetailSectionExpanded,
    required this.controllers,
    required this.selectedSubCategories,
    required this.onLocationDataChanged,
    required this.onDetailSectionExpandedChanged,
    this.onAIDataParsed,
  }) : super(key: key);

  @override
  _ApplyPageDynamicFieldsState createState() => _ApplyPageDynamicFieldsState();
}

class _ApplyPageDynamicFieldsState extends State<ApplyPageDynamicFields> {
  List<Map<String, dynamic>> _deliverAddressResults = [];
  bool _isDeliverAddressLoading = false;
  String _deliverAddressError = '';
  bool _isAddressLoading = false;
  String _addressError = '';

  List<Map<String, dynamic>> _terminalAddressResults = [];
  bool _isTerminalAddressLoading = false;
  String _terminalAddressError = '';

  @override
  Widget build(BuildContext context) {
    final fields = CATEGORY_APPLY_FIELDS[widget.englishCategoryToSave] ?? [];
    if (fields.isEmpty) return const SizedBox.shrink();

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
              widget.onDetailSectionExpandedChanged(
                  !widget.isDetailSectionExpanded);
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
                    turns: widget.isDetailSectionExpanded ? 0.5 : 0,
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

          // 상세정보 입력 영역
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: widget.isDetailSectionExpanded ? null : 0,
            child: widget.isDetailSectionExpanded
                ? Container(
              margin: const EdgeInsets.only(top: 16),
              child: Column(
                children: [
                  // ⭐ AI 자동 입력 버튼 (용차 카테고리에서만 표시)
                  if (widget.englishCategoryToSave == 'equipApply' || widget.englishCategoryToSave == 'proApply')
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 20),
                      child: ElevatedButton.icon(
                        onPressed: () => _handleAIAutoFill(context),
                        icon: const Icon(Icons.auto_awesome, size: 18),
                        label: Text(
                          widget.englishCategoryToSave == 'equipApply' 
                            ? '카톡/구인글 복사 AI 자동 입력'
                            : '구인글 복사 AI 자동 입력',
                          style: const TextStyle(
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
                          shadowColor: const Color(0xFF6366F1).withOpacity(0.3),
                        ),
                      ),
                    ),
                  
                  // 기존 필드들
                  ...fields
                      .asMap()
                      .entries
                      .map((entry) {
                    final index = entry.key;
                    final field = entry.value;
                    return Padding(
                      padding: EdgeInsets.only(bottom: index < fields.length - 1
                          ? 16
                          : 0),
                      child: _buildFieldWidget(field),
                    );
                  }).toList(),
                ],
              ),
            )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressSearchField(String label,
      IconData icon,
      TextEditingController controller,
      List<Map<String, dynamic>> results,
      bool isLoading,
      String error,
      String type,) {
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
                onPressed: () => _handleGetCurrentLocation(type),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  padding: const EdgeInsets.all(12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Icon(
                    Icons.my_location, size: 16, color: Colors.white),
              ),
            ],
          ),

          if (isLoading) ...[
            const SizedBox(height: 8),
            const Center(child: CircularProgressIndicator()),
          ],

          if (error.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
                error, style: const TextStyle(color: Colors.red, fontSize: 12)),
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

  Widget _buildDeliveryRatioField(Map<String, dynamic> field) {
    final ratioMap = {
      '아파트': 'ratio_apt',
      '일반번지': 'ratio_street',
      '원룸': 'ratio_oneRoom',
    };
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
              Icon(Icons.pie_chart_outline_rounded, size: 16,
                  color: Colors.grey[600]),
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
          ...ratioMap.entries.map((entry) {
            // final label = entry.key;      // '아파트'
            final controllerKey = entry.value; // 'ratio_apt'
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
                        // 부모가 넘겨준 controllers 맵에서 해당 키의 컨트롤러를 꺼냄
                        controller: widget.controllers[controllerKey],
                        decoration: const InputDecoration(
                          hintText: '비율 입력',
                          suffixText: '%',
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                        ),
                        keyboardType: TextInputType.number,
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

  Widget _buildFieldWidget(Map<String, dynamic> field) {
    final fieldId = field['id'];

    // 1. 배송지 비율 그룹
    if (fieldId == 'ratio_group') {
      return _buildDeliveryRatioField(field);
    }

    // 2. 배송지 주소 검색 필드
    if (fieldId == 'deliverAddress' || fieldId == 'conApply_area') {
      return _buildAddressSearchField(
        fieldId == 'deliverAddress' ? '배송지 주소' : '광고지역',
        Icons.location_on_outlined,
        widget.controllers['deliverAddress']!,
        // 부모 컨트롤러 전달
        _deliverAddressResults,
        _isDeliverAddressLoading,
        _deliverAddressError,
        'deliver',
      );
    }

    // 3. 터미널 주소 검색 필드
    if (fieldId == 'terminalAddress') {
      return _buildAddressSearchField(
        '터미널 주소',
        Icons.warehouse_outlined,
        widget.controllers['terminalAddress']!,
        // 부모 컨트롤러 전달
        _terminalAddressResults,
        _isTerminalAddressLoading,
        _terminalAddressError,
        'terminal',
      );
    }

    // 비율 관련 개별 필드는 스킵
    if (fieldId.toString().startsWith('ratio_')) {
      return const SizedBox.shrink();
    }

    // 나머지 일반 필드 (날짜, 폰번호 등)
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          field['placeholder'],
          style: const TextStyle(fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF4a4a4a)),
        ),
        const SizedBox(height: 6),
        if (field['type'] == 'datetime')
          _buildDateTimeField(field)
        else if (field['type'] == 'date')
            _buildDateField(field)
        else if (field['type'] == 'select')
          _buildSelectField(field)
          else
            _buildTextFormField(field),
      ],
    );
  }

  Widget _buildSelectField(Map<String, dynamic> field) {
    final options = field['options'] as List<dynamic>? ?? [];
    final controller = widget.controllers[field['id']];
    
    return DropdownButtonFormField<String>(
      value: controller?.text.isNotEmpty == true && options.contains(controller!.text) 
          ? controller.text 
          : null,
      hint: Text(
        '${field['placeholder']}를 선택해주세요',
        style: const TextStyle(
          color: Color(0xFF9CA3AF),
          fontSize: 14,
        ),
      ),
      decoration: InputDecoration(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF2196F3), width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        filled: true,
        fillColor: const Color(0xFFFAFAFA),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16, 
          vertical: 14
        ),
      ),
      items: options.map<DropdownMenuItem<String>>((option) {
        return DropdownMenuItem<String>(
          value: option.toString(),
          child: Text(
            option.toString(),
            style: const TextStyle(
              color: Color(0xFF1F2937),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        );
      }).toList(),
      onChanged: (String? newValue) {
        if (newValue != null) {
          controller?.text = newValue;
        }
      },
      validator: (value) {
        if (field['required'] == true && (value == null || value.isEmpty)) {
          return '${field['placeholder']}를 선택해주세요.';
        }
        return null;
      },
    );
  }

  Widget _buildTextFormField(Map<String, dynamic> field) {
    return TextFormField(
      controller: widget.controllers[field['id']],
      decoration: InputDecoration(
        hintText: field['type'] == 'textarea'
            ? '${field['placeholder']}를 입력해주세요'
            : '${field['placeholder']}를 입력해주세요',
        hintStyle: const TextStyle(
          color: Color(0xFF9CA3AF),
          fontSize: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF2196F3), width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        filled: true,
        fillColor: const Color(0xFFFAFAFA),
        contentPadding: const EdgeInsets.symmetric(
            horizontal: 16, vertical: 14),
      ),
      keyboardType: (field['type'] == 'tel' || field['type'] == 'number')
          ? TextInputType.phone
          : TextInputType.text,
      maxLines: field['type'] == 'textarea' ? 3 : 1,
      validator: (value) {
        if (field['required'] == true && (value == null || value.isEmpty)) {
          return '${field['placeholder']}를 입력해주세요.';
        }
        return null;
      },
      style: const TextStyle(
        color: Color(0xFF1F2937),
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildDateTimeField(Map<String, dynamic> field) {
    return TextFormField(
      controller: widget.controllers[field['id']],
      decoration: InputDecoration(
        hintText: '${field['placeholder']}를 선택해주세요',
        suffixIcon: const Icon(Icons.calendar_today, size: 20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
      readOnly: true,
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: DateTime.now(),
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
        );

        if (date != null) {
          final time = await showTimePicker(
              context: context, initialTime: TimeOfDay.now());
          if (time != null) {
            final formatted = '${date.year}-${date.month.toString().padLeft(
                2, '0')}-${date.day.toString().padLeft(2, '0')} ${time.hour
                .toString().padLeft(2, '0')}:${time.minute.toString().padLeft(
                2, '0')}';
            widget.controllers[field['id']]?.text = formatted;
          }
        }
      },
    );
  }

  Widget _buildDateField(Map<String, dynamic> field) {
    return TextFormField(
      controller: widget.controllers[field['id']],
      decoration: InputDecoration(
        hintText: '${field['placeholder']}를 선택해주세요',
        suffixIcon: const Icon(Icons.calendar_today, size: 20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
      readOnly: true,
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: DateTime.now(),
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
        );

        if (date != null) {
          final formatted = '${date.year}-${date.month.toString().padLeft(
              2, '0')}-${date.day.toString().padLeft(2, '0')}';
          widget.controllers[field['id']]?.text = formatted;
        }
      },
    );
  }

  void _searchAddress(String query, String type) async {
    if (query
        .trim()
        .isEmpty) return;

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

  void _selectAddress(Map<String, dynamic> address, String type) {
    final addressText = address['juso'] ?? '';
    final lat = double.tryParse(address['y'] ?? '0.0') ?? 0.0;
    final lng = double.tryParse(address['x'] ?? '0.0') ?? 0.0;

    if (type == 'deliver' || type == 'deliver') {
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

  void _handleGetCurrentLocation(String type) async {
    setState(() {
      if (type == 'deliver') {
        _isDeliverAddressLoading = true;
        _deliverAddressError = '';
      } else {
        _isTerminalAddressLoading = true;
        _terminalAddressError = '';
      }
    });

    final location = Location();

    try {
      bool serviceEnabled = await location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await location.requestService();
        if (!serviceEnabled) {
          setState(() {
            _addressError = '위치 서비스가 비활성화되어 있습니다.';
            _isAddressLoading = false;
          });
          return;
        }
      }

      PermissionStatus permissionGranted = await location.hasPermission();
      if (permissionGranted == PermissionStatus.denied) {
        permissionGranted = await location.requestPermission();
        if (permissionGranted != PermissionStatus.granted) {
          setState(() {
            _addressError = '위치 권한이 거부되었습니다.';
            _isAddressLoading = false;
          });
          return;
        }
      }

      final locationData = await location.getLocation();

      final results = await KakaoMapService.coord2Address(
          locationData.longitude!,
          locationData.latitude!
      );

      setState(() {
        if (type == 'deliver') {
          _deliverAddressResults = results;
        } else {
          _terminalAddressResults = results;
        }
      });
    } catch (e) {
      setState(() {
        if (type == 'deliver')
          _deliverAddressError = '오류 발생';
        else
          _terminalAddressError = '오류 발생';
      });
    } finally {
      setState(() {
        _isDeliverAddressLoading = false;
        _isTerminalAddressLoading = false;
      });
    }
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
            Text(
              widget.englishCategoryToSave == 'equipApply'
                ? '카카오톡에서 복사한 용차 관련 메시지를 붙여넣어 주세요.'
                : '카카오톡에서 복사한 구인 관련 메시지를 붙여넣어 주세요.',
              style: const TextStyle(
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
                decoration: InputDecoration(
                  hintText: widget.englishCategoryToSave == 'equipApply'
                    ? '예시:\n용차 구합니다\n서울 강남구 → 부산\n내일 오전 9시 출발\n일당 15만원\n연락처: 010-1234-5678'
                    : '예시:\nCJ대한통운 택배기사 모집\n서울 강남구 일대\n월수익 400만원\n오전 6시 - 오후 2시\n연락처: 010-1234-5678',
                  hintStyle: const TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 13,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
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

      // 카테고리에 따라 다른 파싱 메서드 호출
      final Map<String, dynamic>? parsedData;
      if (widget.englishCategoryToSave == 'equipApply') {
        parsedData = await GeminiService.parseKakaoMessage(inputMessage);
      } else if (widget.englishCategoryToSave == 'proApply') {
        parsedData = await GeminiService.parseJobMessage(inputMessage);
      } else {
        parsedData = null;
      }

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
                color: const Color(0xFF4CAF50).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.check_circle,
                color: Color(0xFF4CAF50),
                size: 24,
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
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '다음 정보가 자동으로 입력되었습니다:',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (parsedData['SubCategories'] != null)
                    _buildInfoRow('차량 종류', (parsedData['SubCategories'] as List).join(', ')),
                  if (parsedData['address'] != null)
                    _buildInfoRow('출발지', parsedData['address']),
                  if (parsedData['deliverAddress'] != null)
                    _buildInfoRow('도착지', parsedData['deliverAddress']),
                  if (parsedData['onePrice'] != null)
                    _buildInfoRow('단가', '${parsedData['onePrice']}원'),
                  if (parsedData['count'] != null)
                    _buildInfoRow('건수', '${parsedData['count']}건'),
                  if (parsedData['equipApply_startDate'] != null)
                    _buildInfoRow('시작일시', parsedData['equipApply_startDate']),
                  if (parsedData['equipApply_phoneNumber'] != null)
                    _buildInfoRow('연락처', parsedData['equipApply_phoneNumber']),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              '위 내용을 확인하고 필요시 수정한 후 등록해주세요.',
              style: TextStyle(
                fontSize: 13,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4CAF50),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
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

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
              ),
            ),
          ),
          const Text(': ', style: TextStyle(color: Color(0xFF6B7280))),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Color(0xFF1F2937),
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
          borderRadius: BorderRadius.circular(12),
        ),
        title: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red[600]),
            const SizedBox(width: 8),
            const Text('오류'),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('확인'),
          ),
        ],
      ),
    );
  }
}