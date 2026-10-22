import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  exportAnalyticsCsv, getAnalyticsOverview, getDepartmentPerformance,
  getDepartments, getDistributionAnalytics, getFeedbackAnalytics,
  getOfficerWorkload, getRequestsOverTime,
} from "../services/requestService";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Icon } from "../components/ui/Icons";
import "../components/analytics/Analytics.css";

const STATUS_COLORS = { SUBMITTED:"#3182CE", PENDING:"#DD6B20", IN_PROGRESS:"#2D6A52", RESOLVED:"#38A169", CLOSED:"#718096" };
const PRIORITY_COLORS = { HIGH:"#E53E3E", MEDIUM:"#DD6B20", LOW:"#38A169" };
const DEPT_PALETTE = ["#2D6A52","#3182CE","#805AD5","#DD6B20","#D69E2E","#38A169","#E53E3E","#319795","#553C9A","#B7791F"];

const fmtHours = (h) => { if (h == null) return "—"; if (h < 24) return `${h}h`; return `${(h/24).toFixed(1)}d`; };
const fmtPct = (v) => (v != null ? `${v}%` : "—");

function DatePresets({ value, onChange }) {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0,10);
  const presets = [
    { label:"7d", start:iso(new Date(today - 6*864e5)), end:iso(today) },
    { label:"30d", start:iso(new Date(today - 29*864e5)), end:iso(today) },
    { label:"90d", start:iso(new Date(today - 89*864e5)), end:iso(today) },
    { label:"All time", start:"", end:"" },
  ];
  return (
    <div className="cg-date-preset-group">
      {presets.map((p) => (
        <button key={p.label} className={`cg-date-preset-btn ${value===p.label?"active":""}`} onClick={() => onChange(p)}>{p.label}</button>
      ))}
    </div>
  );
}

function CGTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="cg-recharts-tooltip">
      {label && <div className="cg-recharts-tooltip-title">{label}</div>}
      {payload.map((e) => (
        <div key={e.name} className="cg-recharts-tooltip-row">
          <span style={{width:10,height:10,borderRadius:"50%",background:e.color,display:"inline-block",flexShrink:0}}/>
          <span>{e.name}</span><span className="cg-recharts-tooltip-val">{e.value}</span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { key:"overview", label:"Overview", icon:"dashboard" },
  { key:"trends", label:"Trends", icon:"clock" },
  { key:"departments", label:"Departments", icon:"departments" },
  { key:"officers", label:"Officer Workload", icon:"officers" },
  { key:"feedback", label:"Feedback", icon:"star" },
  { key:"export", label:"Export", icon:"download" },
];

export default function AdminAnalytics() {
  const [tab, setTab] = useState("overview");
  const [preset, setPreset] = useState("30d");
  const [startDate, setStartDate] = useState(() => { const d=new Date(); d.setDate(d.getDate()-29); return d.toISOString().slice(0,10); });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10));
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [deptPerf, setDeptPerf] = useState([]);
  const [officerWl, setOfficerWl] = useState([]);
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => { getDepartments(true).then((d) => setDepartments(Array.isArray(d)?d:[])).catch(()=>{}); }, []);

  const filterParams = useCallback(() => {
    const p = {};
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    if (deptFilter) p.department_id = Number(deptFilter);
    return p;
  }, [startDate, endDate, deptFilter]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = filterParams();
      const [ov,ts,dist,dp,ow,fb] = await Promise.all([
        getAnalyticsOverview(params), getRequestsOverTime(params), getDistributionAnalytics(params),
        getDepartmentPerformance(params), getOfficerWorkload(params), getFeedbackAnalytics(params),
      ]);
      setOverview(ov);
      const rawTs = Array.isArray(ts) ? ts : Array.isArray(ts?.buckets) ? ts.buckets : [];
      setTimeSeries(rawTs.map((b) => ({
        date: b.date || b.label || "",
        label: b.date || b.label || "",
        received: b.received ?? b.count ?? 0,
        resolved: b.resolved ?? 0,
        count: b.received ?? b.count ?? 0,
      })));
      setDistribution(dist||null);
      setDeptPerf(Array.isArray(dp)?dp:[]);
      setOfficerWl(Array.isArray(ow)?ow:[]);
      setFeedbackData(fb||null);
    } catch { setError("Unable to load analytics. Please try again."); }
    finally { setLoading(false); }
  }, [filterParams]);

  useEffect(() => { load(); }, [load]);

  const handlePreset = ({label,start,end}) => { setPreset(label); setStartDate(start); setEndDate(end); };

  const handleExport = async (reportType) => {
    setExportBusy(true);
    try { await exportAnalyticsCsv({...filterParams(), report_type:reportType}); }
    catch { alert("Export failed. Please try again."); }
    finally { setExportBusy(false); }
  };

  const statusPieData = Array.isArray(distribution?.by_status)
    ? distribution.by_status
        .filter((d) => (d.value ?? 0) > 0)
        .map((d) => ({
          name: d.label || String(d.key || "").replace("_", " "),
          value: d.value ?? 0,
          color: d.color || STATUS_COLORS[d.key] || "#A0AEC0",
        }))
    : distribution?.by_status && typeof distribution.by_status === "object"
    ? Object.entries(distribution.by_status)
        .filter(([, v]) => Number(v) > 0)
        .map(([name, value]) => ({
          name: name.replace("_", " "),
          value: Number(value),
          color: STATUS_COLORS[name] || "#A0AEC0",
        }))
    : [];

  const priorityPieData = Array.isArray(distribution?.by_priority)
    ? distribution.by_priority
        .filter((d) => (d.value ?? 0) > 0)
        .map((d) => ({
          name: d.label || String(d.key || ""),
          value: d.value ?? 0,
          color: d.color || PRIORITY_COLORS[d.key] || "#A0AEC0",
        }))
    : distribution?.by_priority && typeof distribution.by_priority === "object"
    ? Object.entries(distribution.by_priority)
        .filter(([, v]) => Number(v) > 0)
        .map(([name, value]) => ({
          name,
          value: Number(value),
          color: PRIORITY_COLORS[name] || "#A0AEC0",
        }))
    : [];

  const deptBarData = (distribution?.by_department || []).slice(0, 10).map((d, i) => {
    const name = d.label || d.name || "Department";
    const val = d.value ?? d.count ?? 0;
    return {
      name: name.length > 18 ? name.slice(0, 16) + "..." : name,
      fullName: name,
      count: val,
      value: val,
      fill: DEPT_PALETTE[i % DEPT_PALETTE.length],
    };
  });

  const ratingDist = feedbackData?.rating_distribution
    ? Object.entries(feedbackData.rating_distribution).sort(([a],[b])=>Number(b)-Number(a)).map(([star,count])=>({star:Number(star),count}))
    : [];
  const totalFeedback = ratingDist.reduce((s,r)=>s+r.count,0);
  const STAR_COLORS = {5:"#38A169",4:"#56C27A",3:"#D69E2E",2:"#F6934C",1:"#E53E3E"};

  return (
    <div className="cg-analytics-dashboard">
      <PageHeader
        eyebrow="Module 9"
        title="Analytics & Administration"
        description="Data-driven insights into service request performance, department efficiency, officer workload, and citizen satisfaction."
        actions={<Button variant="secondary" size="sm" onClick={load} disabled={loading}><Icon name="refresh" size={15}/><span>{loading?"Refreshing...":"Refresh"}</span></Button>}
      />

      {/* Filter toolbar */}
      <div className="cg-analytics-filter-card">
        <div className="cg-analytics-filter-row">
          <div className="cg-analytics-filter-inputs">
            <div className="cg-filter-group"><label>Period</label><DatePresets value={preset} onChange={handlePreset}/></div>
            <div className="cg-filter-group">
              <label>From</label>
              <input type="date" className="cg-form-input" style={{fontSize:"13px",padding:"5px 10px"}} value={startDate} onChange={(e)=>{setPreset("");setStartDate(e.target.value);}}/>
            </div>
            <div className="cg-filter-group">
              <label>To</label>
              <input type="date" className="cg-form-input" style={{fontSize:"13px",padding:"5px 10px"}} value={endDate} onChange={(e)=>{setPreset("");setEndDate(e.target.value);}}/>
            </div>
            <div className="cg-filter-group">
              <label>Department</label>
              <select className="cg-form-input" style={{fontSize:"13px",padding:"5px 10px"}} value={deptFilter} onChange={(e)=>setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((d)=>(<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={load} disabled={loading}><Icon name="search" size={14}/><span>Apply</span></Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="cg-analytics-tabs">
        {TABS.map((t)=>(
          <button key={t.key} id={`analytics-tab-${t.key}`} className={`cg-analytics-tab-btn ${tab===t.key?"active":""}`} onClick={()=>setTab(t.key)}>
            <Icon name={t.icon} size={15}/>{t.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="cg-empty-state">
          <div className="cg-empty-icon" style={{background:"#FEEBEB",color:"var(--cg-error)"}}><Icon name="alert-triangle" size={24}/></div>
          <h3 className="cg-empty-title">Analytics Unavailable</h3>
          <p className="cg-empty-description">{error}</p>
          <Button variant="primary" onClick={load}>Try again</Button>
        </Card>
      )}
      {loading && !error && (
        <div className="cg-stat-grid">
          {[1,2,3,4].map((i)=><div key={i} className="cg-skeleton" style={{height:115}}/>)}
        </div>
      )}

      {/* ==================== OVERVIEW ==================== */}
      {!loading && !error && tab==="overview" && overview && (
        <>
          <div className="cg-stat-grid">
            <StatCard label="Total Requests" value={overview.total_requests} subtext="Within selected period" icon="requests" accent="primary"/>
            <StatCard label="Resolution Rate" value={fmtPct(overview.resolution_rate)} subtext="Resolved + Closed" icon="check-circle" accent="success"/>
            <StatCard label="Avg. Resolution Time" value={fmtHours(overview.avg_resolution_hours)} subtext="From submission to closure" icon="clock" accent="warning"/>
            <StatCard label="Avg. Satisfaction" value={overview.avg_satisfaction!=null?`${overview.avg_satisfaction} / 5`:"—"} subtext="Citizen feedback rating" icon="star" accent="coral"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(148px,1fr))",gap:16}}>
            {[
              {label:"Submitted",value:overview.submitted_count,color:"#3182CE"},
              {label:"Pending",value:overview.pending_count,color:"#DD6B20"},
              {label:"In Progress",value:overview.in_progress_count,color:"#2D6A52"},
              {label:"Resolved",value:overview.resolved_count,color:"#38A169"},
              {label:"Closed",value:overview.closed_count,color:"#718096"},
              {label:"Unassigned",value:overview.unassigned_count,color:"#E53E3E"},
              {label:"Unrouted",value:overview.unrouted_count,color:"#805AD5"},
              {label:"AI Classified",value:overview.ai_classified_count,color:"#D69E2E"},
            ].map((kpi)=>(
              <div key={kpi.label} className="cg-chart-card" style={{padding:"14px 18px",flexDirection:"row",alignItems:"center",gap:14}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:kpi.color,flexShrink:0,display:"inline-block"}}/>
                <div>
                  <div style={{fontSize:22,fontWeight:700,color:"var(--cg-text-main)",lineHeight:1.1}}>{kpi.value??0}</div>
                  <div style={{fontSize:12,color:"var(--cg-text-secondary)",marginTop:2}}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>
          {distribution && (
            <div className="cg-charts-grid">
              <div className="cg-chart-card">
                <div className="cg-chart-header"><div><div className="cg-chart-title">Status Distribution</div><div className="cg-chart-subtitle">Requests by current status</div></div></div>
                <div className="cg-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({percent})=>percent>0.05?`${(percent*100).toFixed(0)}%`:""} labelLine={false}>
                        {statusPieData.map((e)=><Cell key={e.name} fill={e.color}/>)}
                      </Pie>
                      <Tooltip content={<CGTooltip/>}/>
                      <Legend formatter={(v)=><span style={{fontSize:12,color:"var(--cg-text-secondary)"}}>{v}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="cg-chart-card">
                <div className="cg-chart-header"><div><div className="cg-chart-title">Priority Breakdown</div><div className="cg-chart-subtitle">AI-classified priorities</div></div></div>
                <div className="cg-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={priorityPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({name,percent})=>percent>0.05?`${name} ${(percent*100).toFixed(0)}%`:""} labelLine={false}>
                        {priorityPieData.map((e)=><Cell key={e.name} fill={e.color}/>)}
                      </Pie>
                      <Tooltip content={<CGTooltip/>}/>
                      <Legend formatter={(v)=><span style={{fontSize:12,color:"var(--cg-text-secondary)"}}>{v}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          {deptBarData.length>0 && (
            <div className="cg-chart-card">
              <div className="cg-chart-header"><div><div className="cg-chart-title">Requests by Department (Top 10)</div><div className="cg-chart-subtitle">Volume routed to each department</div></div></div>
              <div className="cg-chart-body" style={{height:240}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptBarData} margin={{top:5,right:20,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-border-light)"/>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:"var(--cg-text-secondary)"}} interval={0} angle={-25} textAnchor="end" height={55}/>
                    <YAxis tick={{fontSize:11,fill:"var(--cg-text-secondary)"}} allowDecimals={false}/>
                    <Tooltip content={({active,payload})=>{
                      if(!active||!payload?.length) return null;
                      return <div className="cg-recharts-tooltip"><div className="cg-recharts-tooltip-title">{payload[0]?.payload?.fullName}</div><div className="cg-recharts-tooltip-row"><span>Requests</span><span className="cg-recharts-tooltip-val">{payload[0]?.value}</span></div></div>;
                    }}/>
                    <Bar dataKey="count" name="Requests" radius={[4,4,0,0]}>{deptBarData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== TRENDS ==================== */}
      {!loading && !error && tab==="trends" && (
        <div className="cg-chart-card">
          <div className="cg-chart-header"><div><div className="cg-chart-title">Requests Over Time</div><div className="cg-chart-subtitle">Volume of submissions per day within selected period</div></div></div>
          {timeSeries.length===0 ? (
            <div style={{padding:40,textAlign:"center",color:"var(--cg-text-secondary)"}}>
              <Icon name="clock" size={32} style={{display:"block",margin:"0 auto 10px",color:"var(--cg-text-muted)"}}/>No time-series data for the selected period.
            </div>
          ) : (
            <div className="cg-chart-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries} margin={{top:10,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-border-light)"/>
                  <XAxis dataKey="label" tick={{fontSize:11,fill:"var(--cg-text-secondary)"}} interval="preserveStartEnd"/>
                  <YAxis tick={{fontSize:11,fill:"var(--cg-text-secondary)"}} allowDecimals={false}/>
                  <Tooltip content={<CGTooltip/>}/>
                  <Line type="monotone" dataKey="count" name="Requests" stroke="#2D6A52" strokeWidth={2.5} dot={false} activeDot={{r:5,fill:"#2D6A52"}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ==================== DEPARTMENTS ==================== */}
      {!loading && !error && tab==="departments" && (
        <div className="cg-chart-card">
          <div className="cg-chart-header"><div><div className="cg-chart-title">Department Performance</div><div className="cg-chart-subtitle">Resolution rate, avg time, and open requests per department</div></div></div>
          {deptPerf.length===0 ? (
            <div style={{padding:40,textAlign:"center",color:"var(--cg-text-secondary)"}}>No department performance data available.</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table className="cg-table" style={{marginTop:0}}>
                <thead><tr>
                  <th>Department</th>
                  <th style={{textAlign:"center"}}>Total</th>
                  <th style={{textAlign:"center"}}>Open</th>
                  <th style={{textAlign:"center"}}>Resolved</th>
                  <th>Resolution Rate</th>
                  <th style={{textAlign:"center"}}>Avg. Time</th>
                  <th style={{textAlign:"center"}}>Avg. Rating</th>
                  <th style={{textAlign:"center"}}>Officers</th>
                </tr></thead>
                <tbody>
                  {deptPerf.map((dept)=>{
                    const pct=dept.resolution_rate??0;
                    const bc=pct>=70?"#38A169":pct>=40?"#DD6B20":"#E53E3E";
                    return (
                      <tr key={dept.department_id}>
                        <td><strong style={{color:"var(--cg-text-main)"}}>{dept.department_name}</strong></td>
                        <td style={{textAlign:"center"}}>{dept.total_requests}</td>
                        <td style={{textAlign:"center"}}>{dept.open_requests}</td>
                        <td style={{textAlign:"center"}}>{dept.resolved_requests}</td>
                        <td style={{minWidth:160}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div className="cg-progress-bar-bg" style={{flex:1}}><div className="cg-progress-bar-fill" style={{width:`${pct}%`,background:bc}}/></div>
                            <span style={{fontSize:12,fontWeight:600,color:bc,width:38}}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{textAlign:"center"}}>{fmtHours(dept.avg_resolution_hours)}</td>
                        <td style={{textAlign:"center"}}>{dept.avg_rating!=null?<span style={{display:"inline-flex",alignItems:"center",gap:3}}><Icon name="star-filled" size={12} style={{color:"#D69E2E"}}/>{dept.avg_rating}</span>:"—"}</td>
                        <td style={{textAlign:"center"}}>{dept.officer_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== OFFICER WORKLOAD ==================== */}
      {!loading && !error && tab==="officers" && (
        <>
          {officerWl.length>0 && (
            <div className="cg-chart-card" style={{marginBottom:20}}>
              <div className="cg-chart-header"><div><div className="cg-chart-title">Open Requests per Officer</div><div className="cg-chart-subtitle">Current active load (top 20)</div></div></div>
              <div className="cg-chart-body" style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={officerWl.slice(0,20).map((o)=>({name:o.officer_name?.split(" ")[0]??"Officer",open:o.open_requests,resolved:o.resolved_requests}))} margin={{top:5,right:20,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-border-light)"/>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:"var(--cg-text-secondary)"}}/>
                    <YAxis tick={{fontSize:11,fill:"var(--cg-text-secondary)"}} allowDecimals={false}/>
                    <Tooltip content={<CGTooltip/>}/>
                    <Legend formatter={(v)=><span style={{fontSize:12}}>{v}</span>}/>
                    <Bar dataKey="open" name="Open" fill="#3182CE" radius={[4,4,0,0]}/>
                    <Bar dataKey="resolved" name="Resolved" fill="#38A169" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="cg-chart-card">
            <div className="cg-chart-header"><div><div className="cg-chart-title">Officer Workload Table</div><div className="cg-chart-subtitle">Assignments and resolution data per officer</div></div></div>
            {officerWl.length===0 ? (
              <div style={{padding:40,textAlign:"center",color:"var(--cg-text-secondary)"}}>No officer workload data for the selected period.</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table className="cg-table" style={{marginTop:0}}>
                  <thead><tr>
                    <th>Officer</th><th>Department</th>
                    <th style={{textAlign:"center"}}>Total Assigned</th>
                    <th style={{textAlign:"center"}}>Open</th>
                    <th style={{textAlign:"center"}}>Resolved</th>
                    <th style={{textAlign:"center"}}>Avg. Resolution</th>
                  </tr></thead>
                  <tbody>
                    {officerWl.map((o)=>(
                      <tr key={o.officer_id}>
                        <td><strong style={{color:"var(--cg-text-main)"}}>{o.officer_name}</strong></td>
                        <td style={{color:"var(--cg-text-secondary)"}}>{o.department_name??"—"}</td>
                        <td style={{textAlign:"center"}}>{o.total_assigned}</td>
                        <td style={{textAlign:"center"}}>
                          <span style={{background:o.open_requests>5?"#FEF3C7":"var(--cg-soft-green)",color:o.open_requests>5?"#92400E":"var(--cg-deep-green)",padding:"2px 8px",borderRadius:4,fontSize:12,fontWeight:600}}>{o.open_requests}</span>
                        </td>
                        <td style={{textAlign:"center"}}>{o.resolved_requests}</td>
                        <td style={{textAlign:"center"}}>{fmtHours(o.avg_resolution_hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== FEEDBACK ==================== */}
      {!loading && !error && tab==="feedback" && feedbackData && (
        <>
          <div className="cg-stat-grid">
            <StatCard label="Total Feedback" value={feedbackData.total_feedback} subtext="Citizen ratings submitted" icon="star" accent="primary"/>
            <StatCard label="Average Rating" value={feedbackData.avg_rating!=null?`${feedbackData.avg_rating} / 5`:"—"} subtext="Platform-wide satisfaction" icon="star-filled" accent="success"/>
            <StatCard label="Feedback Rate" value={feedbackData.feedback_rate!=null?`${feedbackData.feedback_rate}%`:"—"} subtext="Resolved requests rated" icon="check-circle" accent="warning"/>
            <StatCard label="5-Star Reviews" value={feedbackData.rating_distribution?.[5]??0} subtext="Top satisfaction scores" icon="star" accent="coral"/>
          </div>
          <div className="cg-charts-grid">
            <div className="cg-chart-card">
              <div className="cg-chart-header"><div><div className="cg-chart-title">Rating Breakdown</div><div className="cg-chart-subtitle">Distribution of citizen ratings 1-5</div></div></div>
              <div style={{padding:"8px 0"}}>
                {ratingDist.map(({star,count})=>{
                  const pct=totalFeedback>0?Math.round((count/totalFeedback)*100):0;
                  return (
                    <div key={star} className="cg-rating-breakdown-row">
                      <div className="cg-rating-star-label"><span style={{fontWeight:700}}>{star}</span><Icon name="star-filled" size={12} style={{color:STAR_COLORS[star]}}/></div>
                      <div style={{flex:1}}><div className="cg-progress-bar-bg"><div className="cg-progress-bar-fill" style={{width:`${pct}%`,background:STAR_COLORS[star]}}/></div></div>
                      <span className="cg-rating-count">{count}</span>
                      <span style={{width:36,fontSize:12,color:"var(--cg-text-muted)",textAlign:"right"}}>{pct}%</span>
                    </div>
                  );
                })}
                {ratingDist.length===0 && <p style={{fontSize:13,color:"var(--cg-text-secondary)",padding:"16px 0"}}>No ratings in selected period.</p>}
              </div>
            </div>
            <div className="cg-chart-card">
              <div className="cg-chart-header"><div><div className="cg-chart-title">Department Satisfaction</div><div className="cg-chart-subtitle">Average citizen rating per department</div></div></div>
              {feedbackData.department_feedback?.length>0 ? (
                <div style={{overflowY:"auto",maxHeight:300}}>
                  {feedbackData.department_feedback.map((df)=>(
                    <div key={df.department_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 4px",borderBottom:"1px solid var(--cg-border-light)",fontSize:13}}>
                      <span style={{color:"var(--cg-text-main)",fontWeight:500}}>{df.department_name}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <Icon name="star-filled" size={13} style={{color:"#D69E2E"}}/>
                        <strong style={{fontSize:14}}>{df.avg_rating??"—"}</strong>
                        <span style={{color:"var(--cg-text-muted)",fontSize:11}}>({df.feedback_count} reviews)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={{fontSize:13,color:"var(--cg-text-secondary)",padding:"16px 0"}}>No department feedback data.</p>}
            </div>
          </div>
        </>
      )}
      {!loading && !error && tab==="feedback" && !feedbackData && (
        <Card><p style={{color:"var(--cg-text-secondary)",fontSize:14,textAlign:"center",padding:24}}>No feedback analytics available for the selected period.</p></Card>
      )}

      {/* ==================== EXPORT ==================== */}
      {!loading && !error && tab==="export" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))",gap:20}}>
          {[
            {key:"requests",label:"Service Requests",description:"All request fields including status, priority, category, location, and department.",icon:"requests"},
            {key:"department_performance",label:"Department Performance",description:"Resolution rates, average handling time, and satisfaction scores by department.",icon:"departments"},
            {key:"officer_workload",label:"Officer Workload",description:"Total assigned, open, and resolved requests per officer.",icon:"officers"},
            {key:"feedback",label:"Citizen Feedback",description:"All ratings and comments submitted by citizens for resolved requests.",icon:"star"},
          ].map((report)=>(
            <div key={report.key} className="cg-chart-card">
              <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
                <div style={{width:42,height:42,borderRadius:"var(--radius-md)",background:"var(--cg-soft-green)",color:"var(--cg-primary-green)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name={report.icon} size={20}/>
                </div>
                <div><div className="cg-chart-title" style={{marginBottom:3}}>{report.label}</div><div className="cg-chart-subtitle">{report.description}</div></div>
              </div>
              <Button variant="secondary" size="sm" style={{width:"100%"}} disabled={exportBusy} onClick={()=>handleExport(report.key)}>
                <Icon name="download" size={14}/><span>{exportBusy?"Preparing...":"Download CSV"}</span>
              </Button>
            </div>
          ))}
          <div className="cg-chart-card" style={{gridColumn:"1 / -1",background:"var(--cg-cream-bg)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <Icon name="alert" size={16} style={{color:"var(--cg-text-secondary)"}}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--cg-text-main)"}}>Note on Exported Data</span>
            </div>
            <p style={{fontSize:13,color:"var(--cg-text-secondary)",lineHeight:1.6}}>All exports respect the date range and department filters set above. Citizen personal data is excluded from request exports. Data is provided in UTF-8 CSV format.</p>
          </div>
        </div>
      )}
    </div>
  );
}