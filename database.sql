-- phpMyAdmin SQL Dump
-- version 3.4.6-rc1
-- http://www.phpmyadmin.net
--
-- Хост: localhost
-- Время создания: Фев 25 2013 г., 11:55
-- Версия сервера: 5.1.68
-- Версия PHP: 5.3.15

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- База данных: `osme`
--

-- --------------------------------------------------------

--
-- Структура таблицы `cache`
--

CREATE TABLE IF NOT EXISTS `cache` (
  `url` text COLLATE utf8_bin NOT NULL,
  `content` longtext COLLATE utf8_bin NOT NULL,
  `timestamp` int(10) unsigned NOT NULL,
  `crc` int(11) unsigned NOT NULL,
  KEY `crc` (`crc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `freeslots`
--

CREATE TABLE IF NOT EXISTS `freeslots` (
  `slot` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `geometry`
--

CREATE TABLE IF NOT EXISTS `geometry` (
  `regionId` int(11) NOT NULL,
  `PathId` int(11) NOT NULL,
  `geometry` polygon NOT NULL,
  PRIMARY KEY (`regionId`),
  SPATIAL KEY `sp_index` (`geometry`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `regionBox`
--

CREATE TABLE IF NOT EXISTS `regionBox` (
  `regionId` int(11) NOT NULL,
  `minX` float NOT NULL,
  `maxX` float NOT NULL,
  `minY` float NOT NULL,
  `maxY` float NOT NULL,
  PRIMARY KEY (`regionId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `regionParents`
--

CREATE TABLE IF NOT EXISTS `regionParents` (
  `region` int(11) NOT NULL,
  `Parent` int(11) NOT NULL,
  `deltaLevel` int(11) NOT NULL,
  `stage` int(11) NOT NULL,
  KEY `region` (`region`),
  KEY `Parent` (`Parent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `regionParentsSlots`
--

CREATE TABLE IF NOT EXISTS `regionParentsSlots` (
  `region` int(11) NOT NULL,
  `slot` int(11) NOT NULL,
  `free` int(11) NOT NULL,
  KEY `region` (`region`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `regionPaths`
--

CREATE TABLE IF NOT EXISTS `regionPaths` (
  `regionId` int(11) NOT NULL,
  `pathId` int(11) NOT NULL,
  `wayId` int(11) NOT NULL,
  `direction` int(11) NOT NULL,
  `order` int(11) NOT NULL,
  KEY `regionId` (`regionId`),
  KEY `ways` (`wayId`,`direction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `regions`
--

CREATE TABLE IF NOT EXISTS `regions` (
  `Id` int(11) NOT NULL,
  `parent` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `minx` float NOT NULL,
  `miny` float NOT NULL,
  `maxx` float NOT NULL,
  `maxy` float NOT NULL,
  `flag` int(11) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `level` (`parent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `regions_i18n`
--

CREATE TABLE IF NOT EXISTS `regions_i18n` (
  `regionId` int(11) NOT NULL,
  `lang` varchar(8) COLLATE utf8_bin NOT NULL,
  `value` tinytext COLLATE utf8_bin NOT NULL,
  KEY `regionId` (`regionId`,`lang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `regions_tags`
--

CREATE TABLE IF NOT EXISTS `regions_tags` (
  `regionId` int(11) NOT NULL,
  `tag` varchar(16) COLLATE utf8_bin NOT NULL,
  `value` varchar(64) COLLATE utf8_bin NOT NULL,
  KEY `regionId` (`regionId`,`tag`(4))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Структура таблицы `ways`
--

CREATE TABLE IF NOT EXISTS `ways` (
  `id` int(11) NOT NULL,
  `coordinates` longtext COLLATE utf8_bin NOT NULL,
  `tags` text COLLATE utf8_bin NOT NULL,
  `minx` float NOT NULL,
  `miny` float NOT NULL,
  `maxx` float NOT NULL,
  `maxy` float NOT NULL,
  `firstNode` int(11) NOT NULL,
  `LastNode` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `minx` (`miny`,`maxy`,`minx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
