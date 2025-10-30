

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, LineChart, Line } from 'recharts';
import { createClient } from '@supabase/supabase-js';


// Use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log(supabaseUrl)
console.log(supabaseKey)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CallDurationData {
  time: number;
  value: number;
}

interface AnalyticsData {
  callDurationData: CallDurationData[];
  updatedAt: string;
}

const VoiceAnalyticsDashboard = () => {
  const [userEmail, setUserEmail] = useState<string>('');
  const [isEmailSubmitted, setIsEmailSubmitted] = useState<boolean>(false);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [editingChart, setEditingChart] = useState<string | null>(null);
  const [previousData, setPreviousData] = useState<AnalyticsData | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  
  const initialCallDurationData: CallDurationData[] = [
    { time: 0, value: 20 }, { time: 1, value: 25 }, { time: 2, value: 35 },
    { time: 3, value: 50 }, { time: 4, value: 70 }, { time: 5, value: 85 },
    { time: 6, value: 95 }, { time: 7, value: 98 }, { time: 8, value: 95 },
    { time: 9, value: 85 }, { time: 10, value: 70 }, { time: 11, value: 50 },
    { time: 12, value: 35 }, { time: 13, value: 25 }, { time: 14, value: 20 },
  ];

  const [callDurationData, setCallDurationData] = useState<CallDurationData[]>(initialCallDurationData);

  const [sadPathData] = useState([
    { name: 'Identity Refusal', value: 28, color: '#a8d5e2' },
    { name: 'Caller ID Issues', value: 22, color: '#b8e1ed' },
    { name: 'Incorrect Identity', value: 15, color: '#6fa8dc' },
    { name: 'Verbal Agression', value: 12, color: '#a4c68f' },
    { name: 'Customer Hostility', value: 10, color: '#7ba3c0' },
    { name: 'Language Barrier', value: 8, color: '#5b8db8' },
  ]);

  const [successRateData] = useState([
    { month: 'Jan', rate: 75 }, { month: 'Feb', rate: 78 }, { month: 'Mar', rate: 82 },
    { month: 'Apr', rate: 85 }, { month: 'May', rate: 88 }, { month: 'Jun', rate: 92 },
  ]);

  const [callVolumeData] = useState([
    { hour: '9 AM', volume: 120 }, { hour: '10 AM', volume: 180 }, { hour: '11 AM', volume: 220 },
    { hour: '12 PM', volume: 190 }, { hour: '1 PM', volume: 160 }, { hour: '2 PM', volume: 200 },
    { hour: '3 PM', volume: 240 }, { hour: '4 PM', volume: 210 }, { hour: '5 PM', volume: 150 },
  ]);

  const [editFormData, setEditFormData] = useState<CallDurationData[]>([]);

  useEffect(() => {
    
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsEmailSubmitted(true);
      
    }
  }, []);

  const loadUserData = async (email: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          
          console.log('No previous data found for user');
          setPreviousData(null);
          
          setCallDurationData(initialCallDurationData);
        } else {
          console.error('Error loading data:', error);
        }
        return;
      }

      if (data) {
        const userData: AnalyticsData = {
          callDurationData: data.call_duration_data,
          updatedAt: data.updated_at
        };
        setPreviousData(userData);
        
        setCallDurationData(data.call_duration_data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (userEmail && userEmail.includes('@')) {
      
      setIsEmailSubmitted(true);
      setShowEmailModal(false);
      
      await loadUserData(userEmail);
    }
  };

  const handleEditChart = () => {
    if (!isEmailSubmitted) {
      setShowEmailModal(true);
      return;
    }

    
    loadUserData(userEmail).then(() => {
      if (previousData) {
        setShowOverwriteConfirm(true);
      } else {
        startEditing();
      }
    });
  };

  const startEditing = () => {
    setEditingChart('callDuration');
    
    setEditFormData([...callDurationData]);
    setShowOverwriteConfirm(false);
  };

  const handleFormChange = (index: number, value: string) => {
    const newData = [...editFormData];
    newData[index].value = parseFloat(value) || 0;
    setEditFormData(newData);
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    
    try {
      
      const { data, error } = await supabase
        .from('user_analytics')
        .upsert({
          email: userEmail,
          call_duration_data: editFormData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving data:', error);
        
        const analyticsData: AnalyticsData = {
          callDurationData: editFormData,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`analytics_${userEmail}`, JSON.stringify(analyticsData));
        setPreviousData(analyticsData);
      } else if (data) {
        const savedData: AnalyticsData = {
          callDurationData: data.call_duration_data,
          updatedAt: data.updated_at
        };
        setPreviousData(savedData);
        
        setCallDurationData(data.call_duration_data);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsLoading(false);
      setEditingChart(null);
    }
  };

  const handleResetToDefault = () => {
    
    setCallDurationData(initialCallDurationData);
    setPreviousData(null);
    
    if (userEmail) {
      localStorage.removeItem(`analytics_${userEmail}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    setUserEmail('');
    setIsEmailSubmitted(false);
    setPreviousData(null);
    
    setCallDurationData(initialCallDurationData);
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (index === undefined) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 40;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {sadPathData[index].name}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Voice Agent Analytics</h1>
              <p className="text-gray-600 mt-2">Real-time performance metrics and insights</p>
            </div>
            {isEmailSubmitted && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Logged in as: {userEmail}</span>
                <button
                  onClick={handleResetToDefault}
                  className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Reset to Default
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-700">Loading...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          {/* Call Duration Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Call Duration Analysis</h2>
                <p className="text-gray-500 text-sm">Average call duration patterns</p>
                {previousData && (
                  <p className="text-xs text-green-600 mt-1">
                    Using your saved data from {new Date(previousData.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleEditChart}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Edit Data'}
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={callDurationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDuration)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

     
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sad Path Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Sad Path Analysis</h2>
              <p className="text-gray-500 text-sm">Common failure reasons distribution</p>
            </div>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sadPathData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieLabel}
                    innerRadius={80}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {sadPathData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Percentage']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Call Volume Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Call Volume Distribution</h2>
              <p className="text-gray-500 text-sm">Hourly call patterns throughout the day</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={callVolumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar 
                  dataKey="volume" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Email</h3>
              <p className="text-gray-600">
                To save your custom analytics data, please provide your email address.
              </p>
            </div>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailSubmit}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteConfirm && previousData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Previous Data Found</h3>
              <p className="text-gray-600 mb-4">
                You have previously saved data from {new Date(previousData.updatedAt).toLocaleDateString()}.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-sm text-gray-700 mb-3">Your Previous Values:</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {previousData.callDurationData.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="text-gray-600 bg-white p-2 rounded text-center">
                    T{item.time}: {item.value}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                ...and {previousData.callDurationData.length - 6} more values
              </p>
            </div>
            <p className="text-gray-600 mb-6 text-center">
              Would you like to overwrite this data with new values?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOverwriteConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startEditing}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm"
              >
                Yes, Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingChart === 'callDuration' && !showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex-shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Edit Call Duration Data</h3>
              <p className="text-gray-600 mb-6">Adjust the values for each time period</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {editFormData.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time {item.time}
                    </label>
                    <input
                      type="number"
                      value={item.value}
                      onChange={(e) => handleFormChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-semibold"
                      min="0"
                      max="100"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 border-t pt-6">
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditingChart(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAnalyticsDashboard;