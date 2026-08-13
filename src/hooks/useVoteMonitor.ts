import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'

interface VoteStats {
  totalPlayers: number
  votedCount: number
  options: Array<{
    id: string
    label: string
    votes: number
    percentage: number
  }>
  maxVotes: number
  hasAbsoluteMajority: boolean
  majorityOptionId: string | null
  allVoted: boolean
}

export function useVoteMonitor(voteId: string | null): VoteStats | null {
  const [stats, setStats] = useState<VoteStats | null>(null)

  useEffect(() => {
    if (!voteId) return

    const fetchVoteStats = async () => {
      try {
        // Get vote data
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select('*')
          .eq('id', voteId)
          .single()

        if (voteError) throw voteError

        // Get all votes
        const { data: playerVotes, error: votesError } = await supabase
          .from('player_votes')
          .select('option_id')
          .eq('vote_id', voteId)

        if (votesError) throw votesError

        // Count votes per option
        const voteCounts = new Map<string, number>()
        voteData.options.forEach((opt: any) => {
          voteCounts.set(opt.id, 0)
        })

        playerVotes.forEach((vote: any) => {
          voteCounts.set(vote.option_id, (voteCounts.get(vote.option_id) || 0) + 1)
        })

        // Calculate stats
        const totalPlayers = voteData.total_players_at_open || 1
        const votedCount = playerVotes.length
        const maxVotes = Math.max(...Array.from(voteCounts.values()), 0)

        const optionsWithStats = voteData.options.map((opt: any) => ({
          id: opt.id,
          label: opt.label,
          votes: voteCounts.get(opt.id) || 0,
          percentage: totalPlayers > 0 ? Math.round(((voteCounts.get(opt.id) || 0) / totalPlayers) * 100) : 0,
        }))

        // Check for absolute majority (> 50%)
        const majorityThreshold = totalPlayers / 2
        let majorityOptionId: string | null = null
        let hasAbsoluteMajority = false

        optionsWithStats.forEach((opt: any) => {
          if (opt.votes > majorityThreshold) {
            hasAbsoluteMajority = true
            majorityOptionId = opt.id
          }
        })

        const allVoted = votedCount === totalPlayers

        setStats({
          totalPlayers,
          votedCount,
          options: optionsWithStats,
          maxVotes,
          hasAbsoluteMajority,
          majorityOptionId,
          allVoted,
        })
      } catch (err) {
        console.error('Error monitoring vote:', err)
      }
    }

    // Initial fetch
    fetchVoteStats()

    // Subscribe to changes
    const channel = supabase
      .channel(`vote-monitor:${voteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_votes',
          filter: `vote_id=eq.${voteId}`,
        },
        () => {
          fetchVoteStats()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [voteId])

  return stats
}
