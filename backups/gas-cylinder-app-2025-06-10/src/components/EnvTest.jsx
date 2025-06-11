import React, { useEffect, useState } from 'react';
import { testEnvironmentVariables } from '../utils/envTest';

export default function EnvTest() {
    const [testResults, setTestResults] = useState(null);

    useEffect(() => {
        const results = testEnvironmentVariables();
        setTestResults(results);
    }, []);

    if (!testResults) return null;

    return (
        <div className="p-4 rounded-lg shadow-sm max-w-md mx-auto mt-8">
            <div className={`p-4 rounded-lg ${testResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <h2 className="text-lg font-semibold mb-2">
                    Environment Variables Status
                </h2>
                <p className={`${testResults.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResults.message}
                </p>
                {!testResults.success && (
                    <div className="mt-4">
                        <p className="text-sm text-gray-700">Please add the missing variables to your .env file:</p>
                        <ul className="list-disc list-inside mt-2">
                            {testResults.missing.map((variable) => (
                                <li key={variable} className="text-sm text-red-600">{variable}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
} 