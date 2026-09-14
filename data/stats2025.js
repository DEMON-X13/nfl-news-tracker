/* 2025 season team stats, the baseline behind the Full stat breakdown until a week supplies its own.
   Per game unless noted. Source: TeamRankings 2025 season tables pulled September 13, 2026 (includes
   postseason games), and ESPN team statistics for 20+ yard plays (regular season).
     ppg   points per game            pa    points allowed per game
     ypp   yards per play             yppa  yards per play allowed
     to    turnover margin per game   sk    sacks per game       ska   sacks allowed per game
     third third down conversion %    rz    red zone TD %        expl  plays of 20+ yards per game
   A week can override any team with a "stats" object of the same shape (season to date, 2026). */
const STATS25 = {
  ARI: {ppg:20.9, pa:28.7, ypp:5.2, yppa:5.6, to:-0.1, sk:1.8, ska:3.5, third:41.5, rz:54.1, expl:3.4},
  ATL: {ppg:20.8, pa:23.6, ypp:5.4, yppa:5.3, to:0.3, sk:3.4, ska:1.5, third:33.3, rz:62, expl:3.3},
  BAL: {ppg:24.9, pa:23.4, ypp:5.8, yppa:5.5, to:-0.2, sk:1.8, ska:2.6, third:40.9, rz:47.5, expl:4},
  BUF: {ppg:28.3, pa:22.2, ypp:5.9, yppa:5.3, to:-0.1, sk:1.9, ska:2.3, third:46.4, rz:67.1, expl:4.5},
  CAR: {ppg:19, pa:23, ypp:5, yppa:5.5, to:-0.2, sk:1.7, ska:2.1, third:36.4, rz:57.1, expl:3.1},
  CHI: {ppg:25.7, pa:24.3, ypp:5.7, yppa:5.9, to:0.9, sk:2.1, ska:1.3, third:43.8, rz:57.1, expl:4.2},
  CIN: {ppg:24.4, pa:28.9, ypp:5.3, yppa:6.2, to:-0.2, sk:2.1, ska:2.1, third:43.4, rz:66.7, expl:3.2},
  CLE: {ppg:16.4, pa:22.3, ypp:4.3, yppa:4.8, to:-0.4, sk:3.1, ska:3, third:33.6, rz:52.6, expl:2.4},
  DAL: {ppg:27.7, pa:30.1, ypp:5.9, yppa:6.1, to:-0.5, sk:2.1, ska:1.8, third:41.2, rz:56.9, expl:4.1},
  DEN: {ppg:23.2, pa:18.5, ypp:5.2, yppa:4.5, to:-0.1, sk:4, ska:1.4, third:41.1, rz:55.6, expl:3.4},
  DET: {ppg:28.3, pa:24.3, ypp:6, yppa:5.4, to:0.2, sk:2.9, ska:2.3, third:38.8, rz:62.5, expl:4.6},
  GB : {ppg:23.2, pa:21.7, ypp:5.6, yppa:5, to:0.2, sk:2.1, ska:1.7, third:48.2, rz:59.7, expl:3.8},
  HOU: {ppg:23.7, pa:17.3, ypp:5.1, yppa:4.7, to:0.7, sk:2.9, ska:1.9, third:39.2, rz:45.9, expl:3.3},
  IND: {ppg:27.4, pa:24.2, ypp:5.8, yppa:5.3, to:-0.1, sk:2.3, ska:1.7, third:42.6, rz:65.2, expl:3.2},
  JAX: {ppg:27.7, pa:20.2, ypp:5.3, yppa:5, to:0.7, sk:1.8, ska:2.3, third:39.8, rz:62.5, expl:3.9},
  KC : {ppg:21.3, pa:19.3, ypp:5.1, yppa:5.2, to:-0.1, sk:2.1, ska:2.8, third:37.4, rz:57.6, expl:3.2},
  LV : {ppg:14.2, pa:25.4, ypp:4.4, yppa:5, to:-0.4, sk:2.2, ska:3.8, third:33.8, rz:50, expl:2.5},
  LAC: {ppg:20.6, pa:19.8, ypp:5.1, yppa:5.1, to:0.2, sk:2.8, ska:3.7, third:44.4, rz:45.8, expl:3.5},
  LAR: {ppg:30, pa:21.3, ypp:6.1, yppa:5.2, to:0.7, sk:2.6, ska:1.5, third:37.1, rz:64.4, expl:4.9},
  MIA: {ppg:20.4, pa:24.9, ypp:5.4, yppa:5.8, to:-0.2, sk:2.3, ska:2.2, third:34.9, rz:56.3, expl:3.5},
  MIN: {ppg:20.2, pa:19.6, ypp:4.9, yppa:4.7, to:-0.5, sk:2.9, ska:3.5, third:31.8, rz:56.9, expl:2.7},
  NE : {ppg:26.5, pa:17.9, ypp:5.8, yppa:4.9, to:0.1, sk:2.3, ska:3.3, third:40.6, rz:55.7, expl:5},
  NO : {ppg:18, pa:22.5, ypp:5, yppa:4.8, to:-0.2, sk:2.6, ska:2.9, third:39.5, rz:44.4, expl:2.2},
  NYG: {ppg:22.4, pa:25.8, ypp:5.2, yppa:5.8, to:-0.1, sk:2.3, ska:2.8, third:40.2, rz:47.5, expl:3.6},
  NYJ: {ppg:17.6, pa:29.6, ypp:4.4, yppa:5.6, to:-1.1, sk:1.5, ska:3.5, third:34.9, rz:44.7, expl:2.3},
  PHI: {ppg:22.1, pa:19.3, ypp:5.2, yppa:5, to:0.4, sk:2.4, ska:2, third:36.7, rz:70.2, expl:3},
  PIT: {ppg:22.4, pa:23.2, ypp:5.2, yppa:5.5, to:0.7, sk:2.8, ska:1.9, third:38.4, rz:56.6, expl:3.1},
  SF : {ppg:24.5, pa:22.7, ypp:5.5, yppa:5.5, to:-0.6, sk:1.2, ska:1.6, third:50, rz:65.2, expl:3.2},
  SEA: {ppg:29.2, pa:16.9, ypp:5.8, yppa:4.7, to:0.2, sk:2.8, ska:1.7, third:39.6, rz:55.4, expl:4.4},
  TB : {ppg:22.4, pa:24.2, ypp:5.1, yppa:5.7, to:0.4, sk:2.2, ska:2.2, third:41.2, rz:54, expl:3.8},
  TEN: {ppg:16.7, pa:28.1, ypp:4.4, yppa:5.8, to:-0.3, sk:2.5, ska:3.3, third:31.9, rz:57.6, expl:3},
  WAS: {ppg:20.9, pa:26.5, ypp:5.5, yppa:6, to:-0.8, sk:2.5, ska:2.2, third:37.6, rz:65.2, expl:3}
};
