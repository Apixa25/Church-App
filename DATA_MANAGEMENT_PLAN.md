# Data Management Plan - Facebook/X Approach 🎯

## Overview

This document outlines our data management strategy using the **Facebook/X approach**: server-side processing with async optimization. This provides the best user experience by allowing immediate uploads while processing happens in the background.

**Key Principle**: Users upload original files immediately → Server processes and optimizes asynchronously → Optimized versions replace originals when ready.

---

## 🎯 Goals

1. **Best User Experience**: Immediate uploads, no waiting for compression
2. **Optimal Quality**: Server-side processing preserves maximum quality
3. **Efficient Storage**: Compress and optimize on server to reduce storage costs
4. **Scalability**: Async processing allows system to handle load efficiently
5. **Reliability**: Consistent processing regardless of client device

---

## 📊 Architecture Overview

```
┌─────────────────┐
│   Mobile App    │
│  (User Device)  │
└────────┬────────┘
         │
         │ 1. Upload Original (Fast)
         │    - Images: up to 20MB
         │    - Videos: up to 100MB, max 30 seconds
         │
         ▼
┌─────────────────┐
│  Spring Boot    │
│    Backend      │
└────────┬────────┘
         │
         ├─► 2. Store Original in S3 (Immediate)
         │
         └─► 3. Queue for Processing (Async)
             │
             ▼
┌─────────────────┐
│  Processing     │
│   Services      │
│  (Background)   │
└────────┬────────┘
         │
         ├─► Image Processing
         │   - Resize to max 1920x1920
         │   - Compress JPEG (85% quality)
         │   - Strip EXIF data
         │   - Convert HEIC/HEIF to JPEG
         │
         └─► Video Processing
             - Validate duration (30 seconds max)
             - Transcode to 480p (854x480)
             - H.264 codec, 1000 kbps
             - AAC audio, 128 kbps
             │
             ▼
┌─────────────────┐
│   AWS S3        │
│   Storage       │
└─────────────────┘
         │
         ├─► /originals/ (temporary)
         └─► /optimized/ (final)
```

---

## 🏗️ Implementation Phases

### Phase 1: Foundation - Async Processing Infrastructure
**Timeline**: Week 1  
**Priority**: CRITICAL

**Objectives**:
- Set up async processing infrastructure
- Create processing services (Image & Video)
- Implement basic upload flow

**Tasks**:
1. Create `ImageProcessingService` with Thumbnailator
2. Create `VideoProcessingService` with JavaCV
3. Add async executor service configuration
4. Update `FileUploadService` for async processing
5. Add processing status tracking

**Deliverables**:
- ✅ Async processing infrastructure
- ✅ Image processing service
- ✅ Video processing service
- ✅ Updated file upload flow

---

### Phase 2: Image Processing
**Timeline**: Week 1-2  
**Priority**: HIGH

**Objectives**:
- Implement server-side image compression
- Support multiple formats (JPEG, PNG, WebP, HEIC/HEIF)
- Generate optimized versions

**Image Processing Specifications**:
- **Max Dimensions**: 1920x1920 (maintain aspect ratio)
- **JPEG Quality**: 85% (balance quality/size)
- **Format**: Convert all to JPEG (smallest size)
- **EXIF**: Strip metadata to reduce size
- **HEIC/HEIF**: Convert to JPEG (iPhone support)

**Expected Results**:
- 20MB original → 1-2MB optimized (90-95% reduction)
- 5MB original → 500KB-1MB optimized (80-90% reduction)

**Tasks**:
1. Implement image resizing
2. Implement JPEG compression
3. Add HEIC/HEIF conversion support
4. Strip EXIF data
5. Update database to reference optimized versions
6. Clean up originals after processing

---

### Phase 3: Video Processing
**Timeline**: Week 2-3  
**Priority**: HIGH

**Objectives**:
- Implement server-side video compression
- Transcode all videos to 480p
- Enforce 30-second duration limit

**Video Processing Specifications**:
- **Resolution**: 854x480 (480p)
- **Video Codec**: H.264 (AVC)
- **Video Bitrate**: 1000 kbps (1 Mbps)
- **Frame Rate**: 30 fps (or match source if lower)
- **Audio Codec**: AAC
- **Audio Bitrate**: 128 kbps
- **Container**: MP4
- **Max Duration**: 30 seconds (reject if longer)

**Expected Results**:
- 100MB 4K video → 5-8MB 480p (92-95% reduction)
- 50MB 1080p video → 4-6MB 480p (88-92% reduction)
- 30MB 720p video → 3-5MB 480p (83-90% reduction)

**Tasks**:
1. Implement video duration validation
2. Implement video transcoding to 480p
3. Add H.264 encoding
4. Add AAC audio encoding
5. Update database to reference optimized versions
6. Clean up originals after processing

---

### Phase 4: File Management & Cleanup
**Timeline**: Week 3  
**Priority**: MEDIUM

**Objectives**:
- Implement automatic cleanup of originals
- Track processing status
- Handle processing failures gracefully

**Tasks**:
1. Create cleanup service for processed originals
2. Add processing status tracking (pending, processing, completed, failed)
3. Implement retry logic for failed processing
4. Add monitoring and logging
5. Create scheduled cleanup job

---

### Phase 5: Enhanced Features (Future)
**Timeline**: Future  
**Priority**: LOW

**Future Enhancements**:
- Multiple quality versions (360p, 480p, 720p) for adaptive streaming
- Thumbnail generation for videos
- Progressive image loading
- CDN integration (CloudFront)
- ML-based quality optimization

---

## 📁 Code Structure

```
backend/src/main/java/com/churchapp/
├── service/
│   ├── FileUploadService.java (updated - async processing)
│   ├── ImageProcessingService.java (new)
│   ├── VideoProcessingService.java (new)
│   └── FileCleanupService.java (new)
├── config/
│   ├── AsyncProcessingConfig.java (new - executor configuration)
│   └── ProcessingScheduler.java (new - cleanup jobs)
├── dto/
│   ├── ProcessingStatus.java (new)
│   ├── ImageProcessingResult.java (new)
│   └── VideoProcessingResult.java (new)
└── entity/
    └── MediaFile.java (new - track processing status)

frontend/src/
├── components/
│   ├── MediaUploader.tsx (simplified - no compression)
│   └── PostComposer.tsx (simplified - no compression)
└── services/
    └── postApi.ts (no changes needed)
```

---

## 🔧 Technical Specifications

### Image Processing

**Library**: Thumbnailator 0.4.20
```xml
<dependency>
    <groupId>net.coobird</groupId>
    <artifactId>thumbnailator</artifactId>
    <version>0.4.20</version>
</dependency>
```

**Processing Steps**:
1. Read original image
2. Resize if dimensions exceed 1920x1920 (maintain aspect ratio)
3. Convert to JPEG format
4. Compress with 85% quality
5. Strip EXIF metadata
6. Save optimized version
7. Upload to S3 `/optimized/` folder
8. Update database reference
9. Delete original after 24 hours

**Supported Formats**:
- Input: JPEG, PNG, GIF, WebP, HEIC, HEIF
- Output: JPEG (optimized)

---

### Video Processing

**Library**: JavaCV 1.5.9
```xml
<dependency>
    <groupId>org.bytedeco</groupId>
    <artifactId>javacv-platform</artifactId>
    <version>1.5.9</version>
</dependency>
```

**Processing Steps**:
1. Validate video duration (max 30 seconds)
2. Extract video metadata (resolution, codec, duration)
3. Transcode to 480p (854x480)
4. Encode with H.264 codec at 1000 kbps
5. Encode audio with AAC at 128 kbps
6. Save as MP4
7. Upload to S3 `/optimized/` folder
8. Update database reference
9. Delete original after 24 hours

**Supported Formats**:
- Input: MP4, WebM, MOV (iPhone)
- Output: MP4 (H.264/AAC)

---

### File Size Limits

**Before Processing (Upload Limits)**:
- **Images**: 20MB (will compress to ~1-2MB)
- **Videos**: 100MB, max 30 seconds (will compress to ~5-8MB)
- **Audio**: 10MB (no processing)
- **Documents**: 10MB (no processing)

**After Processing (Storage)**:
- **Images**: ~500KB-2MB (90-95% reduction)
- **Videos**: ~3-8MB (85-95% reduction)

---

## ⚙️ Configuration Properties

Add to `application.properties`:

```properties
# File Upload Limits (before processing)
media.upload.image.max-size=20971520
media.upload.video.max-size=104857600
media.upload.audio.max-size=10485760
media.upload.document.max-size=10485760

# Image Processing
media.image.max-width=1920
media.image.max-height=1920
media.image.jpeg-quality=0.85
media.image.strip-exif=true
media.image.convert-heic=true

# Video Processing
media.video.target-width=854
media.video.target-height=480
media.video.bitrate=1000
media.video.audio-bitrate=128
media.video.frame-rate=30
media.video.max-duration-seconds=30

# Processing Configuration
media.processing.async.enabled=true
media.processing.async.core-pool-size=2
media.processing.async.max-pool-size=4
media.processing.async.queue-capacity=100

# Cleanup Configuration
media.cleanup.original-retention-hours=24
media.cleanup.enabled=true
media.cleanup.schedule-cron=0 0 2 * * ? # Daily at 2 AM
```

---

## 🔄 Processing Flow

### Image Upload Flow

```
1. User selects image (up to 20MB)
   ↓
2. Frontend validates (size, type)
   ↓
3. Upload to backend immediately
   ↓
4. Backend stores original in S3 (/originals/)
   ↓
5. Return URL to frontend (user can continue)
   ↓
6. Queue image for processing (async)
   ↓
7. Process image:
   - Resize if needed
   - Compress to JPEG 85%
   - Strip EXIF
   ↓
8. Upload optimized to S3 (/optimized/)
   ↓
9. Update database to use optimized URL
   ↓
10. Schedule original for deletion (24 hours)
```

### Video Upload Flow

```
1. User selects video (up to 100MB, max 30 seconds)
   ↓
2. Frontend validates (size, type, duration)
   ↓
3. Upload to backend immediately
   ↓
4. Backend stores original in S3 (/originals/)
   ↓
5. Return URL to frontend (user can continue)
   ↓
6. Queue video for processing (async)
   ↓
7. Process video:
   - Validate duration (reject if >30s)
   - Transcode to 480p
   - Encode H.264/AAC
   ↓
8. Upload optimized to S3 (/optimized/)
   ↓
9. Update database to use optimized URL
   ↓
10. Schedule original for deletion (24 hours)
```

---

## 📊 Database Schema Updates

### New Table: `media_files`

```sql
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_url VARCHAR(500) NOT NULL,
    optimized_url VARCHAR(500),
    file_type VARCHAR(50) NOT NULL, -- 'image' or 'video'
    processing_status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    original_size BIGINT NOT NULL,
    optimized_size BIGINT,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_media_files_status ON media_files(processing_status);
CREATE INDEX idx_media_files_created_at ON media_files(created_at);
```

### Update Existing Tables

Add `media_file_id` foreign key to:
- `posts` table (for post media)
- `messages` table (for message media)
- `prayer_requests` table (for prayer images)
- `announcements` table (for announcement images)

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Image processing service
- [ ] Video processing service
- [ ] File validation logic
- [ ] Async processing configuration

### Integration Tests
- [ ] End-to-end image upload and processing
- [ ] End-to-end video upload and processing
- [ ] Processing failure handling
- [ ] Cleanup job execution

### Performance Tests
- [ ] Concurrent upload handling
- [ ] Processing queue performance
- [ ] Memory usage during processing
- [ ] CPU usage during video transcoding

### Quality Tests
- [ ] Image quality assessment
- [ ] Video quality assessment (480p acceptable?)
- [ ] File size reduction verification
- [ ] User acceptance testing

---

## 📈 Expected Impact

### Storage Reduction
| Content Type | Before | After | Reduction |
|-------------|--------|-------|-----------|
| Images (20MB) | 20MB | 1-2MB | **90-95%** |
| Videos (100MB) | 100MB | 5-8MB | **92-95%** |
| **Combined** | - | - | **90-95%** |

### User Experience
- **Upload Time**: Immediate (no client-side processing delay)
- **Processing Time**: Background (user can continue using app)
- **Quality**: Better (server has more processing power)
- **Reliability**: Consistent (not dependent on device)

### Cost Savings (Example: 1000 users, 10 uploads/user/month)
| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Storage (GB/month) | 100 | 5-10 | **90-95%** |
| Bandwidth Upload (GB/month) | 100 | 100 | 0% (same) |
| Bandwidth Download (GB/month) | 200 | 20-40 | **80-90%** |
| S3 Storage Cost | $2.30 | $0.12-0.23 | **$2.07-2.18** |
| Data Transfer Cost | $18 | $1.80-3.60 | **$14.40-16.20** |
| **Total Monthly Savings** | - | - | **$16.47-18.38** |

---

## 🚨 Error Handling

### Processing Failures
- **Strategy**: Keep original file if processing fails
- **Retry Logic**: Retry failed processing 3 times with exponential backoff
- **Notification**: Log errors, notify admins of repeated failures
- **User Experience**: Original file remains accessible

### Upload Failures
- **Strategy**: Return clear error message to user
- **Retry**: Allow user to retry upload
- **Validation**: Validate before upload to prevent common failures

### Storage Failures
- **Strategy**: Retry S3 operations with exponential backoff
- **Fallback**: Store in database if S3 unavailable (temporary)
- **Monitoring**: Alert on S3 failures

---

## 📝 Implementation Checklist

### Phase 1: Foundation
- [ ] Add Thumbnailator dependency
- [ ] Add JavaCV dependency
- [ ] Create AsyncProcessingConfig
- [ ] Create ImageProcessingService
- [ ] Create VideoProcessingService
- [ ] Update FileUploadService for async processing
- [ ] Create MediaFile entity
- [ ] Create database migration

### Phase 2: Image Processing
- [ ] Implement image resizing
- [ ] Implement JPEG compression
- [ ] Add HEIC/HEIF support (or conversion)
- [ ] Strip EXIF data
- [ ] Update database references
- [ ] Test image processing

### Phase 3: Video Processing
- [ ] Implement duration validation
- [ ] Implement video transcoding
- [ ] Add H.264 encoding
- [ ] Add AAC audio encoding
- [ ] Update database references
- [ ] Test video processing

### Phase 4: Cleanup & Management
- [ ] Create FileCleanupService
- [ ] Implement original file cleanup
- [ ] Add processing status tracking
- [ ] Create scheduled cleanup job
- [ ] Add monitoring and logging

### Phase 5: Frontend Updates
- [ ] Remove client-side compression
- [ ] Simplify MediaUploader component
- [ ] Simplify PostComposer component
- [ ] Update file size limits in UI
- [ ] Add processing status indicator (optional)

---

## 🔍 Monitoring & Logging

### Key Metrics to Track
- Processing queue size
- Average processing time
- Processing success/failure rate
- Storage usage (before/after processing)
- Upload success rate
- Error rates by type

### Logging
- Log all uploads (size, type, user)
- Log processing start/completion
- Log processing failures with details
- Log cleanup operations
- Log storage savings

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- ✅ Async processing infrastructure working
- ✅ Images can be uploaded and processed
- ✅ Videos can be uploaded and processed
- ✅ Processing happens in background
- ✅ No client-side compression

### Phase 2 Complete When:
- ✅ Images compressed to 90%+ size reduction
- ✅ Image quality acceptable
- ✅ HEIC/HEIF support working
- ✅ EXIF data stripped

### Phase 3 Complete When:
- ✅ Videos compressed to 90%+ size reduction
- ✅ All videos at 480p
- ✅ 30-second limit enforced
- ✅ Video quality acceptable

### Phase 4 Complete When:
- ✅ Originals cleaned up after 24 hours
- ✅ Processing failures handled gracefully
- ✅ Monitoring in place
- ✅ All tests passing

---

## 📚 References

- [Thumbnailator Documentation](https://github.com/coobird/thumbnailator)
- [JavaCV Documentation](https://github.com/bytedeco/javacv)
- [Facebook Video Encoding](https://engineering.fb.com/2021/04/05/video-engineering/how-facebook-encodes-your-videos/)
- [Instagram Video Processing](https://engineering.fb.com/2022/11/04/video-engineering/instagram-video-processing-encoding-reduction/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)

---

## 🚀 Next Steps

1. **Review this plan** with the team
2. **Start Phase 1** - Set up async processing infrastructure
3. **Implement Phase 2** - Image processing
4. **Implement Phase 3** - Video processing
5. **Implement Phase 4** - Cleanup and management
6. **Test thoroughly** before deployment
7. **Monitor metrics** after deployment
8. **Iterate** based on results

---

**Last Updated**: 2024  
**Status**: Ready for Implementation  
**Approach**: Facebook/X Server-Side Processing  
**Priority**: HIGH - Implement before deployment

