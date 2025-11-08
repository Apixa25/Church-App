package com.churchapp.repository;

import com.churchapp.entity.User;
import com.churchapp.entity.WorshipQueueEntry;
import com.churchapp.entity.WorshipSongVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipSongVoteRepository extends JpaRepository<WorshipSongVote, UUID> {

    // Find vote by queue entry, user, and vote type
    Optional<WorshipSongVote> findByQueueEntryAndUserAndVoteType(
        WorshipQueueEntry queueEntry,
        User user,
        WorshipSongVote.VoteType voteType
    );

    // Check if user has voted
    @Query("SELECT COUNT(wsv) > 0 FROM WorshipSongVote wsv WHERE wsv.queueEntry = :entry AND wsv.user = :user AND wsv.voteType = :voteType")
    boolean hasUserVoted(
        @Param("entry") WorshipQueueEntry entry,
        @Param("user") User user,
        @Param("voteType") WorshipSongVote.VoteType voteType
    );

    // Find all votes for a queue entry
    List<WorshipSongVote> findByQueueEntry(WorshipQueueEntry queueEntry);

    // Find votes by type for an entry
    List<WorshipSongVote> findByQueueEntryAndVoteType(WorshipQueueEntry queueEntry, WorshipSongVote.VoteType voteType);

    // Count votes by type for an entry
    long countByQueueEntryAndVoteType(WorshipQueueEntry queueEntry, WorshipSongVote.VoteType voteType);

    // Count upvotes
    @Query("SELECT COUNT(wsv) FROM WorshipSongVote wsv WHERE wsv.queueEntry = :entry AND wsv.voteType = 'UPVOTE'")
    long countUpvotes(@Param("entry") WorshipQueueEntry entry);

    // Count skip votes
    @Query("SELECT COUNT(wsv) FROM WorshipSongVote wsv WHERE wsv.queueEntry = :entry AND wsv.voteType = 'SKIP'")
    long countSkipVotes(@Param("entry") WorshipQueueEntry entry);

    // Find all votes by user
    List<WorshipSongVote> findByUserOrderByCreatedAtDesc(User user);

    // Delete all votes for a queue entry
    void deleteByQueueEntry(WorshipQueueEntry queueEntry);

    // Find users who voted on an entry
    @Query("SELECT wsv.user FROM WorshipSongVote wsv WHERE wsv.queueEntry = :entry AND wsv.voteType = :voteType")
    List<User> findUsersWhoVoted(@Param("entry") WorshipQueueEntry entry, @Param("voteType") WorshipSongVote.VoteType voteType);
}
