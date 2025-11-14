package com.churchapp.repository;

import com.churchapp.entity.Group;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {

    List<Group> findByType(Group.GroupType type);

    @Query("SELECT g FROM Group g WHERE g.createdByUser.id = :userId ORDER BY g.createdAt DESC")
    List<Group> findByCreatedByUserId(@Param("userId") UUID userId);

    @Query("SELECT g FROM Group g WHERE g.createdByOrg.id = :orgId ORDER BY g.createdAt DESC")
    List<Group> findByCreatedByOrgId(@Param("orgId") UUID orgId);

    @Query("SELECT g FROM Group g WHERE " +
           "LOWER(g.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(g.description) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<Group> searchGroups(@Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("SELECT g FROM Group g WHERE g.type = 'PUBLIC' AND g.deletedAt IS NULL " +
           "ORDER BY g.memberCount DESC, g.createdAt DESC")
    Page<Group> findAllPublicGroups(Pageable pageable);

    @Query("SELECT g FROM Group g WHERE " +
           "g.type = 'ORG_PRIVATE' AND " +
           "g.createdByOrg.id = :orgId AND " +
           "g.deletedAt IS NULL " +
           "ORDER BY g.createdAt DESC")
    Page<Group> findOrgPrivateGroupsByOrgId(@Param("orgId") UUID orgId, Pageable pageable);

    @Modifying
    @Query("UPDATE Group g SET g.memberCount = g.memberCount + 1 WHERE g.id = :groupId")
    void incrementMemberCount(@Param("groupId") UUID groupId);

    @Modifying
    @Query("UPDATE Group g SET g.memberCount = g.memberCount - 1 WHERE g.id = :groupId AND g.memberCount > 0")
    void decrementMemberCount(@Param("groupId") UUID groupId);

    // Tag-based queries (for cross-org group discovery)
    @Query(value = "SELECT * FROM groups g WHERE " +
           "g.tags @> CAST(:tagsJson AS jsonb) AND " +
           "g.deleted_at IS NULL",
           nativeQuery = true)
    List<Group> findByTagsContains(@Param("tagsJson") String tagsJson);

    @Query(value = "SELECT DISTINCT g.* FROM groups g, " +
           "jsonb_array_elements_text(g.tags) tag " +
           "WHERE tag IN (:tags) AND g.deleted_at IS NULL " +
           "ORDER BY g.member_count DESC",
           nativeQuery = true)
    Page<Group> findByTagsIn(@Param("tags") List<String> tags, Pageable pageable);

    @Query("SELECT COUNT(g) FROM Group g WHERE g.deletedAt IS NULL")
    Long countActiveGroups();

    @Query("SELECT COUNT(g) FROM Group g WHERE g.type = 'PUBLIC' AND g.deletedAt IS NULL")
    Long countPublicGroups();
}
