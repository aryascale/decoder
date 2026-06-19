import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Checkpoint {
  id: string;
  name: string;
  identitas: string;
  order: number;
}

interface Registration {
  id: string;
  name: string;
  gender: string;
  bib: string;
  category: string;
  epc: string;
}

interface RecordData {
  epc: string;
  time: string;
  identitas: string;
  order: number;
  checkpointName: string;
}

export function useLiveTiming(eventId: string) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, Registration>>({});
  const [recordsByEpc, setRecordsByEpc] = useState<Record<string, RecordData[]>>({});
  const socketRef = useRef<Socket | null>(null);
  const lastEventIdRef = useRef<string>("");

  const loadData = async (eid: string) => {
    if (!eid || eid === "default") return;
    try {
      const [cpRes, liveRes] = await Promise.all([
        fetch(`/api/checkpoints?eventId=${eid}`, { cache: "no-store" }),
        fetch(`/api/live-timing?eventId=${eid}`, { cache: "no-store" })
      ]);

      if (cpRes.ok) {
        const cpData = await cpRes.json();
        setCheckpoints(cpData.checkpoints || []);
      }

      if (liveRes.ok) {
        const liveData = await liveRes.json();

        const regMap: Record<string, Registration> = {};
        (liveData.registrations || []).forEach((r: Registration) => {
          if (r.epc) regMap[r.epc] = r;
        });
        setRegistrations(regMap);

        const recMap: Record<string, RecordData[]> = {};
        (liveData.records || []).forEach((r: RecordData) => {
          if (!recMap[r.epc]) recMap[r.epc] = [];
          recMap[r.epc].push(r);
        });

        Object.values(recMap).forEach(arr => {
          arr.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        });

        setRecordsByEpc(recMap);
      }
    } catch (err) {
      console.error("[useLiveTiming] Failed to load live timing", err);
    }
  };

  // Run loadData whenever eventId changes AND is valid
  useEffect(() => {
    if (!eventId || eventId === "default") return;

    // Avoid duplicate loads for same eventId
    lastEventIdRef.current = eventId;
    loadData(eventId);

    // Poll every 10s as fallback
    const interval = setInterval(() => {
      if (lastEventIdRef.current) {
        loadData(lastEventIdRef.current);
      }
    }, 10000);

    // Setup Socket.IO
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const newSocket = io({ path: "/socket.io/" });

    newSocket.on(`new_record_${eventId}`, (data: any) => {
      setRecordsByEpc(prev => {
        const epc = data.epc;
        const currentArr = prev[epc] || [];

        const existingIdx = currentArr.findIndex(r => r.identitas === data.checkpoint.identitas);

        const newRecord: RecordData = {
          epc,
          time: data.time,
          identitas: data.checkpoint.identitas,
          order: data.checkpoint.order,
          checkpointName: data.checkpoint.name
        };

        const newArr = [...currentArr];
        if (existingIdx >= 0) {
          newArr[existingIdx] = newRecord;
        } else {
          newArr.push(newRecord);
        }

        newArr.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        return { ...prev, [epc]: newArr };
      });
    });

    socketRef.current = newSocket;

    return () => {
      clearInterval(interval);
      newSocket.disconnect();
    };
  }, [eventId]);

  return { checkpoints, registrations, recordsByEpc };
}
