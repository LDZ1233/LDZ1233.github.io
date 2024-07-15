function updateTimeWeather() {  
    const now = new Date();  
    const timeString = now.toLocaleTimeString();  
    document.getElementById('time-weather').innerHTML = `当前时间: ${timeString}`;  
  
    // 示例：添加天气信息（这里需要你自己接入天气API）  
     fetch('curl "http://v1.yiketianqi.com/api?unescape=1&version=v91&appid=&appsecret="', {  
         method: 'GET',  
        headers: {  
             'Content-Type': 'application/json',  
             'Authorization': 'Bearer YOUR_API_KEY'  
         }  
     })  
     .then(response => response.json())  
     .then(data => {  
         const weatherInfo = `天气: ${data.weather.description}, 温度: ${data.main.temp}°C`;  
         document.getElementById('time-weather').innerHTML += ` | ${weatherInfo}`;  
     })  
     .catch(error => console.error('Error fetching weather:', error));  
}  
  
updateTimeWeather(); // 初始加载时更新  
// 如果需要定时更新天气（例如每小时），可以使用setInterval  
setInterval(updateTimeWeather, 3600000); // 每3600000毫秒（1小时）更新一次
