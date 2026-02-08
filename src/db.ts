import Dexie, { type Table } from 'dexie'
import type {
  Event,
  EventEntry,
  Match,
  MatchLoadout,
  MatchPoint,
  Part,
  Team,
  TeamPart,
  User,
} from './types'

export class BeybattleDB extends Dexie {
  teams!: Table<Team, number>
  users!: Table<User, number>
  team_parts!: Table<TeamPart, number>
  events!: Table<Event, number>
  event_entries!: Table<EventEntry, number>
  matches!: Table<Match, number>
  match_loadouts!: Table<MatchLoadout, number>
  match_points!: Table<MatchPoint, number>
  parts!: Table<Part, number>

  constructor() {
    super('beybattle')

    this.version(1).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, createdAt',
      events: '++id, name, stadium, sideRule, battleType, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, createdAt',
      parts: '++id, name, type',
    })

    this.version(2).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      events: '++id, name, stadium, sideRule, battleType, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, createdAt',
      parts: '++id, name, type',
    })

    this.version(3).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, createdAt',
      event_entries: '++id, eventId, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, createdAt',
      parts: '++id, name, type',
    })

    this.version(4).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, createdAt',
      event_entries: '++id, eventId, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, createdAt',
      parts: '++id, name, type',
    })

    this.version(5).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      team_parts: '++id, teamId, partKind, partCode, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, createdAt',
      event_entries: '++id, eventId, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, createdAt',
      parts: '++id, name, type',
    })

    this.version(6).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      team_parts: '++id, teamId, partKind, partCode, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, createdAt',
      event_entries: '++id, eventId, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, winnerSide, finishType, createdAt',
      parts: '++id, name, type',
    })

    this.version(7).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      team_parts: '++id, teamId, partKind, partCode, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, createdAt',
      event_entries: '++id, eventId, useTeamParts, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, winnerSide, finishType, createdAt',
      parts: '++id, name, type',
    })

    this.version(8).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      team_parts: '++id, teamId, partKind, partCode, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, createdAt',
      event_entries: '++id, eventId, useTeamParts, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, userId, teamId',
      match_points: '++id, matchId, winnerSide, finishType, createdAt',
      parts: '++id, name, type',
    })

    this.version(9).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      team_parts: '++id, teamId, partKind, partCode, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, createdAt',
      event_entries: '++id, eventId, useTeamParts, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, side, entryId',
      match_points: '++id, matchId, winnerSide, finishType, createdAt',
      parts: '++id, name, type',
    })

    this.version(10).stores({
      teams: '++id, name, createdAt',
      users: '++id, name, teamId, active, createdAt',
      team_parts: '++id, teamId, partKind, partCode, createdAt',
      events: '++id, name, stadium, sideRule, battleType, status, scheduledDate, createdAt',
      event_entries: '++id, eventId, useTeamParts, createdAt',
      matches: '++id, eventId, createdAt',
      match_loadouts: '++id, matchId, side, entryId',
      match_points: '++id, matchId, winnerSide, finishType, createdAt',
      parts: '++id, name, type',
    })
  }
}

export const db = new BeybattleDB()
