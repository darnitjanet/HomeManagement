import { useState, useEffect } from 'react';
import { X, TrendingUp, Zap, Moon, Activity, BarChart2, LineChart } from 'lucide-react';
import { moodApi } from '../../services/api';
import './MoodTrends.css';

interface FamilyMember {
  id: number;
  name: string;
  avatarColor: string;
}

interface TimeSeriesPoint {
  date: string;
  moodScore: number;
  memberId: number;
  memberName: string;
}

interface MoodTrend {
  memberId: number;
  memberName: string;
  period: string;
  totalEntries: number;
  averageMoodScore: number;
  averageEnergyLevel: number;
  averageSleepQuality?: number;
  averageSleepHours?: number;
  moodDistribution: Record<string, number>;
  activityCorrelations: Record<string, { count: number; avgMoodScore: number }>;
}

interface MoodTrendsProps {
  familyMembers: FamilyMember[];
  onClose: () => void;
}

const moodColors: Record<string, string> = {
  anxious: '#e74c3c',
  sad: '#3498db',
  stressed: '#e67e22',
  tired: '#95a5a6',
  calm: '#1abc9c',
  content: '#2ecc71',
  happy: '#f1c40f',
  excited: '#e91e63',
  grateful: '#9b59b6',
  energized: '#ff9800',
};

function getMoodScoreLabel(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Okay';
  if (score >= 2.5) return 'Low';
  return 'Struggling';
}

function getMoodScoreColor(score: number): string {
  if (score >= 4.5) return '#27ae60';
  if (score >= 4) return '#2ecc71';
  if (score >= 3) return '#f39c12';
  if (score >= 2.5) return '#e67e22';
  return '#e74c3c';
}

export function MoodTrends({ familyMembers, onClose }: MoodTrendsProps) {
  const [trends, setTrends] = useState<MoodTrend[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState('month');
  const [viewMode, setViewMode] = useState<'graph' | 'stats'>('graph');

  useEffect(() => {
    fetchData();
  }, [selectedMember, dateRange]);

  const getDateParams = () => {
    const params: any = {};
    if (dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
      else if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
      else if (dateRange === '3months') startDate.setMonth(now.getMonth() - 3);
      params.startDate = startDate.toISOString().split('T')[0];
      params.endDate = now.toISOString().split('T')[0];
    }
    return params;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = getDateParams();

      // Fetch both trends and time series data
      const [trendsResponse, timeSeriesResponse] = await Promise.all([
        selectedMember
          ? moodApi.getTrends(selectedMember, params)
          : moodApi.getAllTrends(params),
        moodApi.getTimeSeries({
          memberId: selectedMember || undefined,
          ...params,
        }),
      ]);

      setTrends(trendsResponse.data.data || []);
      setTimeSeries(timeSeriesResponse.data.data || []);
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMemberColor = (memberId: number) => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.avatarColor || '#4ECDC4';
  };

  // Render line graph
  const renderLineGraph = () => {
    if (timeSeries.length === 0) {
      return (
        <div className="empty-graph">
          <p>No mood data for this period</p>
        </div>
      );
    }

    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Group data by member for multiple lines
    const memberData: Record<number, TimeSeriesPoint[]> = {};
    timeSeries.forEach((point) => {
      if (!memberData[point.memberId]) {
        memberData[point.memberId] = [];
      }
      memberData[point.memberId].push(point);
    });

    // Calculate scales
    const dates = timeSeries.map((p) => new Date(p.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateRange = maxDate - minDate || 1;

    const minScore = 1;
    const maxScore = 5;
    const scoreRange = maxScore - minScore;

    const xScale = (date: string) =>
      padding.left + ((new Date(date).getTime() - minDate) / dateRange) * graphWidth;
    const yScale = (score: number) =>
      padding.top + graphHeight - ((score - minScore) / scoreRange) * graphHeight;

    // Generate paths for each member
    const paths = Object.entries(memberData).map(([memberIdStr, points]) => {
      const memberId = parseInt(memberIdStr);
      const color = getMemberColor(memberId);
      const sortedPoints = [...points].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (sortedPoints.length === 0) return null;

      const pathD = sortedPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.date)} ${yScale(p.moodScore)}`)
        .join(' ');

      return (
        <g key={memberId}>
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Points */}
          {sortedPoints.map((p, i) => (
            <circle
              key={i}
              cx={xScale(p.date)}
              cy={yScale(p.moodScore)}
              r={5}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </g>
      );
    });

    // Format date for x-axis labels
    const formatAxisDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Generate x-axis labels (5 labels spread across the range)
    const xLabels = [];
    for (let i = 0; i <= 4; i++) {
      const time = minDate + (dateRange * i) / 4;
      const date = new Date(time);
      const x = padding.left + (graphWidth * i) / 4;
      xLabels.push(
        <text key={i} x={x} y={height - 10} textAnchor="middle" fontSize={11} fill="#666">
          {formatAxisDate(date)}
        </text>
      );
    }

    // Y-axis labels and horizontal grid lines
    const yLabels = [1, 2, 3, 4, 5].map((score) => {
      const y = yScale(score);
      const labels = ['Struggling', 'Low', 'Okay', 'Good', 'Excellent'];
      return (
        <g key={score}>
          <line
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="#eee"
            strokeDasharray="3,3"
          />
          <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#666">
            {score}
          </text>
          <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize={9} fill="#999">
            {labels[score - 1]}
          </text>
        </g>
      );
    });

    // Legend
    const uniqueMembers = [...new Set(timeSeries.map((p) => p.memberId))];

    return (
      <div className="mood-graph-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="mood-line-graph">
          {/* Grid lines */}
          {yLabels}
          {/* Lines and points */}
          {paths}
          {/* X-axis labels */}
          {xLabels}
        </svg>
        {/* Legend */}
        <div className="graph-legend">
          {uniqueMembers.map((memberId) => {
            const member = familyMembers.find((m) => m.id === memberId);
            return (
              <div key={memberId} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: getMemberColor(memberId) }}
                />
                <span>{member?.name || 'Unknown'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trends-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><TrendingUp size={24} /> Mood Trends</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* View Toggle */}
        <div className="view-toggle-container">
          <button
            className={`view-toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => setViewMode('graph')}
          >
            <LineChart size={18} />
            Graph
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'stats' ? 'active' : ''}`}
            onClick={() => setViewMode('stats')}
          >
            <BarChart2 size={18} />
            Stats
          </button>
        </div>

        {/* Filters */}
        <div className="trends-filters">
          <div className="filter-group">
            <label>Person</label>
            <select
              value={selectedMember || ''}
              onChange={(e) => setSelectedMember(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Everyone</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Time Period</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="3months">Last 3 months</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading trends...</div>
        ) : viewMode === 'graph' ? (
          <div className="graph-view">
            {renderLineGraph()}
          </div>
        ) : trends.length === 0 ? (
          <div className="empty-trends">
            <p>No mood data for this period</p>
          </div>
        ) : (
          <div className="trends-content">
            {trends.map((trend) => (
              <div key={trend.memberId} className="trend-card">
                <div className="trend-header">
                  <span
                    className="member-avatar"
                    style={{ backgroundColor: getMemberColor(trend.memberId) }}
                  >
                    {trend.memberName.charAt(0)}
                  </span>
                  <div className="trend-title">
                    <h3>{trend.memberName}</h3>
                    <span className="entry-count">{trend.totalEntries} entries</span>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="trend-score">
                  <div
                    className="score-circle"
                    style={{ borderColor: getMoodScoreColor(trend.averageMoodScore) }}
                  >
                    <span className="score-value">{trend.averageMoodScore.toFixed(1)}</span>
                    <span className="score-max">/5</span>
                  </div>
                  <span
                    className="score-label"
                    style={{ color: getMoodScoreColor(trend.averageMoodScore) }}
                  >
                    {getMoodScoreLabel(trend.averageMoodScore)}
                  </span>
                </div>

                {/* Stats */}
                <div className="trend-stats">
                  <div className="stat-item">
                    <Zap size={18} />
                    <span>Avg Energy: {trend.averageEnergyLevel.toFixed(1)}/5</span>
                  </div>
                  {trend.averageSleepQuality && (
                    <div className="stat-item">
                      <Moon size={18} />
                      <span>Avg Sleep Quality: {trend.averageSleepQuality.toFixed(1)}/5</span>
                    </div>
                  )}
                  {trend.averageSleepHours && (
                    <div className="stat-item">
                      <Moon size={18} />
                      <span>Avg Sleep: {trend.averageSleepHours.toFixed(1)}h</span>
                    </div>
                  )}
                </div>

                {/* Mood Distribution */}
                <div className="mood-distribution">
                  <h4>Mood Distribution</h4>
                  <div className="mood-bars">
                    {Object.entries(trend.moodDistribution)
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([mood, count]) => (
                        <div key={mood} className="mood-bar">
                          <span className="mood-name">{mood}</span>
                          <div className="bar-container">
                            <div
                              className="bar-fill"
                              style={{
                                width: `${(count / trend.totalEntries) * 100}%`,
                                backgroundColor: moodColors[mood] || '#95a5a6',
                              }}
                            />
                          </div>
                          <span className="mood-count">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Activity Correlations */}
                <div className="activity-correlations">
                  <h4><Activity size={16} /> Activities & Mood</h4>
                  <div className="correlation-list">
                    {Object.entries(trend.activityCorrelations)
                      .filter(([, data]) => data.count > 0)
                      .sort((a, b) => b[1].avgMoodScore - a[1].avgMoodScore)
                      .map(([activity, data]) => (
                        <div key={activity} className="correlation-item">
                          <span className="activity-name">{activity.replace('_', ' ')}</span>
                          <span className="activity-count">{data.count}x</span>
                          <span
                            className="activity-score"
                            style={{ color: getMoodScoreColor(data.avgMoodScore) }}
                          >
                            {data.avgMoodScore.toFixed(1)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
