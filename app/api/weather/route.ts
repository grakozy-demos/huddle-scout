import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const city = "Bozeman";
  const country = "US";

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${apiKey}&units=imperial`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json(
      { result: "Weather unavailable right now." },
      { status: 200 }
    );
  }

  const data = await res.json();
  const temp = Math.round(data.main.temp);
  const condition = data.weather[0].description;
  const feelsLike = Math.round(data.main.feels_like);

  const result = `It's ${temp}°F and ${condition} in Bozeman right now, feels like ${feelsLike}°F.`;
  return NextResponse.json({ result });
}
